import json
import logging
import os
import re
import sqlite3
import uuid
from typing import Any, AsyncGenerator, Dict, List, Optional
from contextlib import asynccontextmanager

import httpx
import numpy as np
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import psycopg2
from psycopg2.extras import RealDictCursor
import pypdf
import io
from pdf_processor import (
    extract_fields_from_document,
    get_donut_pipeline,
    ocr_extract_text_from_page,
    ocr_extract_full_document,
    hybrid_extract,
    TESSERACT_AVAILABLE,
)

from config import (
    DATABASE_URL,
    HOST,
    OLLAMA_BASE_URL,
    OLLAMA_CHAT_MODEL,
    OLLAMA_EMBED_MODEL,
    PORT,
)
from nlp.wordcloud_engine import WordCloudEngine
from generator.report_engine import ReportEngine
from parliamentary.parliamentary_engine import ParliamentaryEngine
from tabular_processor import MultimodalTabularProcessor
from data_validator import DataValidator

wordcloud_engine = WordCloudEngine()
report_engine = ReportEngine(ollama_url=OLLAMA_BASE_URL, chat_model=OLLAMA_CHAT_MODEL)
parliamentary_engine = ParliamentaryEngine(ollama_url=OLLAMA_BASE_URL, chat_model=OLLAMA_CHAT_MODEL)
tabular_processor = MultimodalTabularProcessor()
data_validator = DataValidator()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ml_service")

# Database connection helpers
SQLITE_DB_PATH = os.path.join(os.path.dirname(__file__), "rag_fallback.db")

def get_sqlite_conn():
    conn = sqlite3.connect(SQLITE_DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_sqlite_schema():
    conn = get_sqlite_conn()
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS document_chunks (
            id TEXT PRIMARY KEY,
            document_id TEXT,
            filename TEXT NOT NULL,
            content TEXT NOT NULL,
            embedding_json TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)
    conn.commit()
    cur.close()
    conn.close()

def get_db_connection():
    try:
        conn = psycopg2.connect(DATABASE_URL)
        return conn
    except Exception as e:
        logger.warning(f"Could not connect to PostgreSQL via DATABASE_URL: {e}. Utilizing fallback local storage.")
        return None

def init_db_schema():
    init_sqlite_schema()
    conn = get_db_connection()
    if not conn:
        logger.info("PostgreSQL currently offline; fallback SQLite database initialized.")
        return
    try:
        cur = conn.cursor()
        try:
            cur.execute("CREATE EXTENSION IF NOT EXISTS vector;")
            conn.commit()
            has_vector = True
            logger.info("PostgreSQL 'vector' extension is active.")
        except Exception as e:
            conn.rollback()
            has_vector = False
            logger.info(f"Native 'vector' extension not active ({e}). Using JSON vector storage.")

        if has_vector:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS document_chunks (
                    id TEXT PRIMARY KEY,
                    document_id TEXT,
                    filename TEXT NOT NULL,
                    content TEXT NOT NULL,
                    embedding vector(768),
                    embedding_json JSONB,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)
        else:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS document_chunks (
                    id TEXT PRIMARY KEY,
                    document_id TEXT,
                    filename TEXT NOT NULL,
                    content TEXT NOT NULL,
                    embedding_json JSONB,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)
        conn.commit()
        cur.close()
        conn.close()
        logger.info("PostgreSQL schema checked/initialized successfully.")
    except Exception as e:
        logger.error(f"Error initializing DB schema: {e}")
        if conn:
            conn.rollback()
            conn.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db_schema()
    try:
        logger.info("Initializing offline Donut visual document processor...")
        get_donut_pipeline()
    except Exception as e:
        logger.warning(f"Donut model preloading deferred: {e}")
    yield

app = FastAPI(title="CoalGov ML & AI Copilot Service", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Models
class HistoryItem(BaseModel):
    role: str
    content: str

class ChatStreamRequest(BaseModel):
    sessionId: Optional[str] = None
    message: str
    history: Optional[List[HistoryItem]] = []
    systemPrompt: Optional[str] = None

class RagQueryRequest(BaseModel):
    query: str
    top_k: Optional[int] = 4
    document_ids: Optional[List[str]] = None

# Helper: embed text using Ollama
async def embed_text(text: str) -> List[float]:
    async with httpx.AsyncClient(timeout=60.0) as client:
        # Ollama supports /api/embeddings or /api/embed
        resp = await client.post(
            f"{OLLAMA_BASE_URL}/api/embeddings",
            json={"model": OLLAMA_EMBED_MODEL, "prompt": text},
        )
        if resp.status_code == 200:
            data = resp.json()
            return data.get("embedding", [])
        
        resp2 = await client.post(
            f"{OLLAMA_BASE_URL}/api/embed",
            json={"model": OLLAMA_EMBED_MODEL, "input": text},
        )
        if resp2.status_code == 200:
            data = resp2.json()
            embeddings = data.get("embeddings", [])
            if embeddings:
                return embeddings[0]
        
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate embeddings from Ollama: {resp.text}"
        )

# Helper: chunking
def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> List[str]:
    cleaned = re.sub(r'\s+', ' ', text).strip()
    if not cleaned:
        return []
    chunks = []
    start = 0
    text_len = len(cleaned)
    while start < text_len:
        end = min(start + chunk_size, text_len)
        chunk = cleaned[start:end]
        chunks.append(chunk)
        if end == text_len:
            break
        start += (chunk_size - overlap)
    return chunks

@app.get("/health")
async def health():
    ollama_status = "unreachable"
    models_available = []
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            res = await client.get(f"{OLLAMA_BASE_URL}/api/tags")
            if res.status_code == 200:
                ollama_status = "connected"
                data = res.json()
                models_available = [m.get("name") for m in data.get("models", [])]
    except Exception as e:
        ollama_status = f"error: {str(e)}"

    return {
        "status": "healthy",
        "service": "ml_service",
        "ollama_url": OLLAMA_BASE_URL,
        "ollama_status": ollama_status,
        "chat_model": OLLAMA_CHAT_MODEL,
        "embed_model": OLLAMA_EMBED_MODEL,
        "models_available": models_available,
        "tesseract_ocr": "available" if TESSERACT_AVAILABLE else "not installed",
    }

@app.post("/chat/stream")
async def chat_stream(req: ChatStreamRequest):
    """
    Streams tokens from Ollama gemma3:1b back to client in SSE format.
    """
    messages = []
    
    # 1. System prompt
    system_text = req.systemPrompt or (
        "You are CoalGov AI Copilot, an expert assistant for Indian coal mining governance, "
        "safety compliance (DGMS regulations, Mines Act 1952), contractor management, and environmental monitoring. "
        "Provide direct, clear, and actionable answers. If context documents are provided, prioritize information from them."
    )
    messages.append({"role": "system", "content": system_text})
    
    # 2. Add history (limit to last 6 messages to stay within gemma3:1b context limit)
    if req.history:
        for item in req.history[-6:]:
            messages.append({"role": item.role, "content": item.content})
    
    # 3. Add latest user query
    messages.append({"role": "user", "content": req.message})

    async def token_generator() -> AsyncGenerator[str, None]:
        payload = {
            "model": OLLAMA_CHAT_MODEL,
            "messages": messages,
            "stream": True,
        }
        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                async with client.stream(
                    "POST",
                    f"{OLLAMA_BASE_URL}/api/chat",
                    json=payload,
                ) as response:
                    if response.status_code != 200:
                        err_text = await response.aread()
                        err_msg = json.dumps({"error": f"Ollama error: {err_text.decode('utf-8')}"})
                        yield f"data: {err_msg}\n\n"
                        return

                    async for line in response.aiter_lines():
                        if not line:
                            continue
                        try:
                            chunk_data = json.loads(line)
                            content_piece = chunk_data.get("message", {}).get("content", "")
                            done = chunk_data.get("done", False)

                            out = json.dumps({"token": content_piece, "done": done})
                            yield f"data: {out}\n\n"

                            if done:
                                break
                        except Exception as parse_err:
                            logger.error(f"Error parsing Ollama stream chunk: {parse_err}")
        except Exception as conn_err:
            logger.error(f"Connection error to Ollama: {conn_err}")
            err_json = json.dumps({"error": f"Failed to communicate with Ollama: {str(conn_err)}"})
            yield f"data: {err_json}\n\n"

    return StreamingResponse(token_generator(), media_type="text/event-stream")

@app.post("/rag/ingest")
async def rag_ingest(
    file: Optional[UploadFile] = File(None),
    text: Optional[str] = Form(None),
    filename: Optional[str] = Form(None),
):
    """
    Ingests a document (via file upload or raw text), extracts text,
    splits into chunks, generates nomic-embed-text embeddings, and persists.
    """
    doc_text = ""
    doc_name = filename or "document.txt"

    if file:
        doc_name = file.filename
        content_bytes = await file.read()
        if doc_name.lower().endswith(".pdf"):
            try:
                reader = pypdf.PdfReader(io.BytesIO(content_bytes))
                pages_text = [page.extract_text() or "" for page in reader.pages]
                doc_text = "\n".join(pages_text)
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Failed to extract text from PDF: {str(e)}")
        else:
            try:
                doc_text = content_bytes.decode("utf-8")
            except Exception:
                doc_text = content_bytes.decode("latin-1", errors="ignore")
    elif text:
        doc_text = text
    else:
        raise HTTPException(status_code=400, detail="Must provide either a file or text.")

    if not doc_text.strip():
        raise HTTPException(status_code=400, detail="Document contains no readable text.")

    chunks = chunk_text(doc_text, chunk_size=500, overlap=50)
    if not chunks:
        raise HTTPException(status_code=400, detail="Unable to create chunks from document.")

    doc_id = str(uuid.uuid4())
    conn = get_db_connection()
    ingested_count = 0

    if conn:
        cur = conn.cursor()
        cur.execute("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'document_chunks' AND column_name = 'embedding';
        """)
        has_native_vector = cur.fetchone() is not None

        for i, chunk in enumerate(chunks):
            chunk_id = f"{doc_id}-{i}"
            embedding = await embed_text(chunk)
            embedding_json = json.dumps(embedding)

            if has_native_vector:
                cur.execute("""
                    INSERT INTO document_chunks (id, document_id, filename, content, embedding, embedding_json)
                    VALUES (%s, %s, %s, %s, %s::vector, %s)
                """, (chunk_id, doc_id, doc_name, chunk, str(embedding), embedding_json))
            else:
                cur.execute("""
                    INSERT INTO document_chunks (id, document_id, filename, content, embedding_json)
                    VALUES (%s, %s, %s, %s, %s)
                """, (chunk_id, doc_id, doc_name, chunk, embedding_json))

            ingested_count += 1

        conn.commit()
        cur.close()
        conn.close()
    else:
        # Fallback to local SQLite storage
        sconn = get_sqlite_conn()
        scur = sconn.cursor()
        for i, chunk in enumerate(chunks):
            chunk_id = f"{doc_id}-{i}"
            embedding = await embed_text(chunk)
            embedding_json = json.dumps(embedding)
            scur.execute("""
                INSERT INTO document_chunks (id, document_id, filename, content, embedding_json)
                VALUES (?, ?, ?, ?, ?)
            """, (chunk_id, doc_id, doc_name, chunk, embedding_json))
            ingested_count += 1
        sconn.commit()
        scur.close()
        sconn.close()

    return {
        "success": True,
        "document_id": doc_id,
        "filename": doc_name,
        "chunks_count": ingested_count,
    }

@app.post("/rag/query")
async def rag_query(req: RagQueryRequest):
    """
    Embeds query, searches PostgreSQL document_chunks by cosine similarity,
    and returns top-k matching chunks.
    """
    if not req.query.strip():
        return {"chunks": []}

    query_embedding = await embed_text(req.query)
    top_k = req.top_k or 4
    document_ids = [doc_id for doc_id in (req.document_ids or []) if doc_id]

    conn = get_db_connection()
    results = []

    if conn:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'document_chunks' AND column_name = 'embedding';
        """)
        has_native_vector = cur.fetchone() is not None

        if has_native_vector:
            try:
                if document_ids:
                    cur.execute("""
                        SELECT id, document_id, filename, content,
                               (1 - (embedding <=> %s::vector)) AS score
                        FROM document_chunks
                        WHERE document_id = ANY(%s)
                        ORDER BY embedding <=> %s::vector
                        LIMIT %s;
                    """, (str(query_embedding), document_ids, str(query_embedding), top_k))
                else:
                    cur.execute("""
                        SELECT id, document_id, filename, content,
                               (1 - (embedding <=> %s::vector)) AS score
                        FROM document_chunks
                        ORDER BY embedding <=> %s::vector
                        LIMIT %s;
                    """, (str(query_embedding), str(query_embedding), top_k))
                rows = cur.fetchall()
                for r in rows:
                    results.append({
                        "id": r["id"],
                        "document_id": r["document_id"],
                        "filename": r["filename"],
                        "content": r["content"],
                        "score": float(r["score"]) if r["score"] is not None else 0.0,
                    })
            except Exception as e:
                logger.warning(f"Native pgvector search failed ({e}), falling back to Python cosine search.")
                has_native_vector = False

        if not has_native_vector:
            if document_ids:
                cur.execute(
                    "SELECT id, document_id, filename, content, embedding_json FROM document_chunks WHERE document_id = ANY(%s);",
                    (document_ids,),
                )
            else:
                cur.execute("SELECT id, document_id, filename, content, embedding_json FROM document_chunks;")
            rows = cur.fetchall()
            if rows:
                q_vec = np.array(query_embedding, dtype=np.float32)
                q_norm = np.linalg.norm(q_vec)
                scored = []
                for r in rows:
                    if not r.get("embedding_json"):
                        continue
                    c_vec = np.array(r["embedding_json"], dtype=np.float32)
                    c_norm = np.linalg.norm(c_vec)
                    if q_norm > 0 and c_norm > 0:
                        cos_sim = float(np.dot(q_vec, c_vec) / (q_norm * c_norm))
                    else:
                        cos_sim = 0.0
                    scored.append({
                        "id": r["id"],
                        "document_id": r["document_id"],
                        "filename": r["filename"],
                        "content": r["content"],
                        "score": cos_sim,
                    })
                scored.sort(key=lambda x: x["score"], reverse=True)
                results = scored[:top_k]

        cur.close()
        conn.close()
    else:
        # Query local SQLite fallback storage
        sconn = get_sqlite_conn()
        scur = sconn.cursor()
        if document_ids:
            placeholders = ",".join("?" for _ in document_ids)
            scur.execute(
                f"SELECT id, document_id, filename, content, embedding_json FROM document_chunks WHERE document_id IN ({placeholders})",
                document_ids,
            )
        else:
            scur.execute("SELECT id, document_id, filename, content, embedding_json FROM document_chunks")
        rows = scur.fetchall()
        if rows:
            q_vec = np.array(query_embedding, dtype=np.float32)
            q_norm = np.linalg.norm(q_vec)
            scored = []
            for r in rows:
                c_json = r["embedding_json"]
                if not c_json:
                    continue
                c_vec = np.array(json.loads(c_json), dtype=np.float32)
                c_norm = np.linalg.norm(c_vec)
                if q_norm > 0 and c_norm > 0:
                    cos_sim = float(np.dot(q_vec, c_vec) / (q_norm * c_norm))
                else:
                    cos_sim = 0.0
                scored.append({
                    "id": r["id"],
                    "document_id": r["document_id"],
                    "filename": r["filename"],
                    "content": r["content"],
                    "score": cos_sim,
                })
            scored.sort(key=lambda x: x["score"], reverse=True)
            results = scored[:top_k]
        scur.close()
        sconn.close()

    return {"chunks": results}

@app.get("/rag/documents")
async def rag_documents():
    """List distinct indexed documents."""
    conn = get_db_connection()
    if conn:
        try:
            cur = conn.cursor(cursor_factory=RealDictCursor)
            cur.execute("""
                SELECT document_id, filename, COUNT(*) as chunks, MIN(created_at) as created_at
                FROM document_chunks
                GROUP BY document_id, filename
                ORDER BY created_at DESC;
            """)
            docs = [dict(r) for r in cur.fetchall()]
            cur.close()
            conn.close()
            return {"documents": docs}
        except Exception:
            if conn:
                conn.close()

    sconn = get_sqlite_conn()
    scur = sconn.cursor()
    scur.execute("""
        SELECT document_id, filename, COUNT(*) as chunks, MIN(created_at) as created_at
        FROM document_chunks
        GROUP BY document_id, filename
        ORDER BY created_at DESC;
    """)
    docs = [dict(r) for r in scur.fetchall()]
    scur.close()
    sconn.close()
    return {"documents": docs}

@app.get("/rag/documents/{document_id}/chunks")
async def rag_document_chunks(document_id: str):
    """Retrieve all content chunks for a specific document."""
    conn = get_db_connection()
    if conn:
        try:
            cur = conn.cursor(cursor_factory=RealDictCursor)
            cur.execute("""
                SELECT id, document_id, filename, content, created_at
                FROM document_chunks
                WHERE document_id = %s
                ORDER BY id ASC;
            """, (document_id,))
            chunks = [dict(r) for r in cur.fetchall()]
            cur.close()
            conn.close()
            if chunks:
                return {"document_id": document_id, "filename": chunks[0]["filename"], "chunks": chunks}
        except Exception:
            if conn:
                conn.close()

    sconn = get_sqlite_conn()
    scur = sconn.cursor()
    scur.execute("""
        SELECT id, document_id, filename, content, created_at
        FROM document_chunks
        WHERE document_id = ?
        ORDER BY id ASC;
    """, (document_id,))
    chunks = [dict(r) for r in scur.fetchall()]
    scur.close()
    sconn.close()
    if not chunks:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"document_id": document_id, "filename": chunks[0]["filename"], "chunks": chunks}

@app.delete("/rag/documents/{document_id}")
async def rag_delete_document(document_id: str):
    """Delete a document and all its chunks from the RAG store."""
    deleted_count = 0
    conn = get_db_connection()
    if conn:
        try:
            cur = conn.cursor()
            cur.execute("DELETE FROM document_chunks WHERE document_id = %s;", (document_id,))
            deleted_count += cur.rowcount
            conn.commit()
            cur.close()
            conn.close()
        except Exception:
            if conn:
                conn.rollback()
                conn.close()

    sconn = get_sqlite_conn()
    scur = sconn.cursor()
    scur.execute("DELETE FROM document_chunks WHERE document_id = ?;", (document_id,))
    deleted_count += scur.rowcount
    sconn.commit()
    scur.close()
    sconn.close()

    return {"success": True, "document_id": document_id, "deleted_chunks": deleted_count}

@app.post("/pdf/extract-fields")
async def extract_pdf_fields(
    file: UploadFile = File(...),
    fields: str = Form(...),
    page: int = Form(0),
    use_cache: bool = Form(True),
):
    """
    Extract structured fields from a PDF or document image using offline Donut DocVQA.
    fields can be a JSON array (e.g. '["lease_id", "lessee_name"]') or comma-separated string.
    """
    try:
        field_list = []
        fields_str = fields.strip()
        if fields_str.startswith("["):
            try:
                field_list = json.loads(fields_str)
            except Exception:
                field_list = [f.strip() for f in fields_str.strip("[]").split(",") if f.strip()]
        else:
            field_list = [f.strip() for f in fields_str.split(",") if f.strip()]

        if not field_list:
            raise HTTPException(status_code=400, detail="No valid field names provided in 'fields'")

        content = await file.read()
        if not content:
            raise HTTPException(status_code=400, detail="Uploaded file is empty")

        result = extract_fields_from_document(
            file_bytes=content,
            filename=file.filename or "document.pdf",
            fields=field_list,
            page_num=page,
            use_cache=use_cache,
        )
        return {"success": True, **result}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in extract_pdf_fields: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

# =========================================================================
# CMPDI / CIL & Ministry of Coal Endpoints
# =========================================================================

class ReportGenerateRequest(BaseModel):
    template_type: str = "MONTHLY_PRODUCTION_OFFTAKE"
    subsidiary: str = "SECL"
    period: str = "FY 2023-24 (Q4)"
    data_payload: Optional[Dict[str, Any]] = None

@app.post("/api/reports/generate")
async def generate_automated_report(req: ReportGenerateRequest):
    """
    Module 1: Automated Report Generation Platform.
    Calculates preparation time reduction percentage and extraction accuracy.
    """
    try:
        payload = req.data_payload or {}
        report = await report_engine.generate_report(
            template_type=req.template_type,
            subsidiary=req.subsidiary,
            period=req.period,
            data_payload=payload
        )
        return report
    except Exception as e:
        logger.error(f"Report generation error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

class ReportExportRequest(BaseModel):
    report_data: Dict[str, Any]

@app.post("/api/reports/export/pdf")
async def export_report_pdf(req: ReportExportRequest):
    """Generates a Ministry-grade formatted PDF report."""
    try:
        pdf_buffer = report_engine.export_pdf(req.report_data)
        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=Report_{req.report_data.get('subsidiary', 'CIL')}.pdf"}
        )
    except Exception as e:
        logger.error(f"PDF Export error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/reports/export/docx")
async def export_report_docx(req: ReportExportRequest):
    """Generates an editable Ministry-grade formatted DOCX report."""
    try:
        docx_buffer = report_engine.export_docx(req.report_data)
        return StreamingResponse(
            docx_buffer,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": f"attachment; filename=Report_{req.report_data.get('subsidiary', 'CIL')}.docx"}
        )
    except Exception as e:
        logger.error(f"DOCX Export error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/reports/export/xlsx")
async def export_report_xlsx(req: ReportExportRequest):
    """Generates a structured, styled Excel workbook (.xlsx) from report tables."""
    try:
        xlsx_buffer = report_engine.export_excel(req.report_data)
        return StreamingResponse(
            xlsx_buffer,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename=Ledger_{req.report_data.get('subsidiary', 'CIL')}.xlsx"}
        )
    except Exception as e:
        logger.error(f"XLSX Export error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/reports/templates")
async def get_report_templates():
    return {
        "templates": [
            {
                "id": "MONTHLY_PRODUCTION_OFFTAKE",
                "title": "Monthly Production & Offtake Review",
                "description": "Standardized compilation of opencast/underground coal production, OBR, and thermal rakes dispatch.",
                "estimatedManualHours": 6.0,
                "targetAutomation": "95%"
            },
            {
                "id": "GEOLOGICAL_RESERVE_ASSESSMENT",
                "title": "Geological Reserve & Seam Quality Assessment",
                "description": "CMPDI exploration compilation, borehole log aggregation, GCV grade classification, and proved reserves.",
                "estimatedManualHours": 8.0,
                "targetAutomation": "92%"
            },
            {
                "id": "MINISTRY_PARLIAMENTARY_SUMMARY",
                "title": "Ministry of Coal Performance & Parliamentary Synthesis",
                "description": "Cross-subsidiary analytical brief for parliamentary standing committee and administrative reviews.",
                "estimatedManualHours": 7.0,
                "targetAutomation": "90%"
            },
            {
                "id": "SUBSIDIARY_BENCHMARKING",
                "title": "Inter-Subsidiary Performance & Efficiency Matrix",
                "description": "Benchmarking stripping ratios, heavy machinery availability, and washery yields across all CIL subsidiaries.",
                "estimatedManualHours": 5.0,
                "targetAutomation": "96%"
            }
        ]
    }

class WordCloudRequest(BaseModel):
    texts: Optional[List[str]] = None
    documents: Optional[List[Dict[str, Any]]] = None
    max_words: int = 50
    subsidiary: Optional[str] = None

@app.post("/api/analytics/wordcloud")
async def generate_wordcloud(req: WordCloudRequest):
    """
    Module 2: Automated Dynamic Word Cloud Generation.
    Filters domain stopwords and calculates real document term frequencies.
    """
    try:
        sample_texts = req.texts or []
        if req.documents and len(req.documents) > 0 and len(sample_texts) == 0:
            sample_texts = [d.get("text", "") for d in req.documents if d.get("text")]

        if not sample_texts:
            sample_texts = [
                "Overburden removal in opencast mines achieved 42.5 M.Cu.m sustaining high bench preparation.",
                "Borehole drilling by CMPDI confirmed 142 MT of proved geological reserves in Raniganj coalfield.",
                "First Mile Connectivity rail corridor and rapid loading system minimized rake siding delays in Talcher.",
                "BCCL enhanced coking coal production to reduce high-grade steel import dependency.",
                "Safety guidelines and statutory compliance audits executed under DGMS supervision across SECL and MCL blocks.",
                "Environmental reclamation, afforestation, and coal bed methane degasification advanced steadily."
            ]

        cloud_data = wordcloud_engine.extract_word_cloud(sample_texts, max_words=req.max_words, documents=req.documents)
        return {"success": True, "wordCloud": cloud_data, "totalWords": len(cloud_data)}
    except Exception as e:
        logger.error(f"Word cloud extraction error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

class TopicRequest(BaseModel):
    documents: Optional[List[Dict[str, Any]]] = None

@app.post("/api/analytics/topics")
async def extract_topic_clusters(req: TopicRequest):
    """
    Module 2: Topic Identification and Semantic Clustering.
    """
    try:
        docs = req.documents or [
            {"title": "SECL Mega Opencast Expansion", "content": "Overburden removal and 42 Cu.m shovels deployment for stripping ratio optimization."},
            {"title": "BCCL Jharia Coking Coal Modernization", "content": "Washing beneficiation and coking coal production for domestic steel plants."},
            {"title": "CMPDI Exploration Bulletin 2024", "content": "Exploratory drilling, borehole core sampling, and seam thickness modeling."},
            {"title": "MCL First Mile Connectivity Project", "content": "Rail siding infrastructure, rapid loading silos, and mechanization of coal transport."},
            {"title": "DGMS Safety and Environmental Audit", "content": "Mine safety norms, slope stability sensors, and statutory compliance enforcement."}
        ]
        topics = wordcloud_engine.extract_topics(docs)
        return {"success": True, "topics": topics}
    except Exception as e:
        logger.error(f"Topic identification error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

class ParliamentaryQueryRequest(BaseModel):
    house: str = "Lok Sabha"
    questionNo: str = "Starred Q.No. 302"
    questionType: str = "Starred"
    subject: str = "Coal Production Targets and Offtake by CIL Subsidiaries"
    questionText: str

@app.post("/api/parliamentary/query")
async def handle_parliamentary_query(req: ParliamentaryQueryRequest):
    """
    Module 3: AI-Based Query and Response System for Parliamentary Questions.
    """
    try:
        res = await parliamentary_engine.draft_response({
            "house": req.house,
            "questionNo": req.questionNo,
            "questionType": req.questionType,
            "subject": req.subject,
            "questionText": req.questionText
        })
        return res
    except Exception as e:
        logger.error(f"Parliamentary query response error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

class ConsistencyValidationRequest(BaseModel):
    subsidiary: str = "SECL"
    metrics: Dict[str, Any]

@app.post("/api/documents/validate-consistency")
async def validate_data_consistency(req: ConsistencyValidationRequest):
    """
    Validates data integrity, mathematical consistency, and historical consistency.
    """
    try:
        report = data_validator.validate_dataset(req.subsidiary, req.metrics)
        return report
    except Exception as e:
        logger.error(f"Consistency validation error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/documents/process-multimodal")
async def process_multimodal_document(file: UploadFile = File(...)):
    """
    Processes Scanned PDFs, Excel spreadsheets (.xlsx), and CSV files.
    Extracts structured geological & mining figures with validation.
    """
    try:
        content = await file.read()
        filename = file.filename or "uploaded_data.csv"
        extracted = tabular_processor.process_file(content, filename)
        
        # Run automated consistency validation if figures found
        if extracted.get("success") and extracted.get("extractedFigures"):
            val_res = data_validator.validate_dataset(
                extracted["extractedFigures"].get("subsidiary", "SECL"),
                extracted["extractedFigures"]
            )
            extracted["validationScorecard"] = val_res

        return extracted
    except Exception as e:
        logger.error(f"Multimodal processing error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

# =========================================================================
# Tesseract OCR Endpoints
# =========================================================================

@app.post("/ocr/extract")
async def ocr_extract_page(
    file: UploadFile = File(...),
    page: int = Form(0),
    lang: str = Form("auto"),
    dpi: int = Form(300),
):
    """
    Extract full text from a single page of a PDF or image using Tesseract OCR.
    Supports auto language detection.
    """
    if not TESSERACT_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="Tesseract OCR is not installed. Install pytesseract and Tesseract binary."
        )
    try:
        content = await file.read()
        if not content:
            raise HTTPException(status_code=400, detail="Uploaded file is empty")

        result = ocr_extract_text_from_page(
            file_bytes=content,
            filename=file.filename or "document.pdf",
            page_num=page,
            lang=lang,
            dpi=dpi,
        )
        return {"success": True, **result}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"OCR extract error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/ocr/extract-full")
async def ocr_extract_all_pages(
    file: UploadFile = File(...),
    lang: str = Form("auto"),
    dpi: int = Form(300),
    max_pages: int = Form(50),
):
    """
    Extract full text from ALL pages of a PDF using Tesseract OCR.
    Returns combined text and per-page breakdown.
    """
    if not TESSERACT_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="Tesseract OCR is not installed. Install pytesseract and Tesseract binary."
        )
    try:
        content = await file.read()
        if not content:
            raise HTTPException(status_code=400, detail="Uploaded file is empty")

        result = ocr_extract_full_document(
            file_bytes=content,
            filename=file.filename or "document.pdf",
            lang=lang,
            dpi=dpi,
            max_pages=max_pages,
        )
        return {"success": True, **result}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"OCR full extract error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/ocr/hybrid")
async def ocr_hybrid_extract(
    file: UploadFile = File(...),
    fields: str = Form(""),
    page: int = Form(0),
    lang: str = Form("auto"),
):
    """
    Hybrid extraction combining Donut DocVQA (structured fields) + Tesseract OCR (full text).
    Provides maximum extraction coverage for scanned mining documents.
    """
    try:
        content = await file.read()
        if not content:
            raise HTTPException(status_code=400, detail="Uploaded file is empty")

        field_list = []
        if fields.strip():
            fields_str = fields.strip()
            if fields_str.startswith("["):
                try:
                    field_list = json.loads(fields_str)
                except Exception:
                    field_list = [f.strip() for f in fields_str.strip("[]").split(",") if f.strip()]
            else:
                field_list = [f.strip() for f in fields_str.split(",") if f.strip()]

        result = hybrid_extract(
            file_bytes=content,
            filename=file.filename or "document.pdf",
            fields=field_list if field_list else None,
            page_num=page,
            lang=lang,
        )
        return {"success": True, **result}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Hybrid extract error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=HOST, port=PORT, reload=False)
