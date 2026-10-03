# ⛏️ CoalSetu — CMPDI / CIL Intelligence & Ministry of Coal Reporting Platform

> **An automated, AI-assisted platform for geological, mining, and production document processing, dynamic topic extraction, cryptographic audit trails, and statutory reporting across Coal India Limited (CIL) subsidiaries and the Ministry of Coal.**

[![Local AI](https://img.shields.io/badge/Local%20AI-Ollama%20gemma3%3A1b-orange.svg)](https://ollama.ai/)
[![Frontend](https://img.shields.io/badge/Frontend-React%2018%20%7C%20Vite%20%7C%20Tailwind-blue.svg)](https://vitejs.dev/)
[![Backend](https://img.shields.io/badge/Backend-Node.js%2018%2B%20%7C%20Express%20%7C%20Prisma-green.svg)](https://nodejs.org/)
[![Database](https://img.shields.io/badge/Database-PostgreSQL%20%7C%20Prisma%20ORM-336791.svg)](https://www.postgresql.org/)
[![ML Service](https://img.shields.io/badge/ML-FastAPI%20%7C%20Tesseract%20%7C%20Camelot-3776AB.svg)](https://fastapi.tiangolo.com/)

---

## 🎯 Executive Summary & Context

CMPDI and CIL subsidiaries (**ECL, BCCL, CCL, WCL, SECL, MCL, NCL, CMPDI**) play a central role in providing geological, exploration, and mining figures to the **Ministry of Coal** and responding to high-priority statutory & parliamentary inquiries. 

Compiling these reports previously relied heavily on manual assembly across scanned PDFs, complex spreadsheets, and physical archives, resulting in high latency, manual transcription risks, and limited rapid retrieval.

**CoalSetu** provides a local-first digital workspace for governance, document processing, and automated reporting.

---

## ✨ Key Features & Technical Modules

### 1. 📄 Universal Multi-Language OCR & Document Intelligence
- **Tesseract OCR Integration:** Supports auto-script & multi-language detection for Hindi (Devanagari), English, Bengali, Tamil, etc.
- **Fail-Proof Windows Auto-Discovery:** Automatically locates `tesseract.exe` in standard system installation paths.
- **SHA-256 Memory & Disk Caching:** Instant (0ms) zero-latency responses for duplicate document requests.
- **Graceful Donut Fallback:** Donut DocVQA visual field extraction with intelligent OCR/regex pattern fallbacks when offline or low-RAM.

### 2. 📊 Hybrid Mining Table Extraction
- **Camelot-py + pdfplumber Pipeline:** Extracts complex grid tables (lattice & stream modes) from PDF reports with high accuracy.
- **Ghostscript Integration:** Native rendering pipeline for mining ledger tables and multi-page spreadsheets.

### 3. 📑 Ministry-Grade Report Export Engine (PDF & DOCX)
- **CIL Dark Blue Theme PDF Export:** Powered by WeasyPrint (with ReportLab fallback) with executive summaries, KPI cards, structured tables, and page numbering.
- **Editable Word (DOCX) Export:** Powered by `python-docx` for official editing by department heads.
- **Real AI Summarization:** Extracts actual document content via OCR and passes text to Ollama LLM for genuine content synthesis.

### 4. 🔍 PostgreSQL Full-Text Search (FTS)
- **Sub-second Multi-Table Search:** Built on PostgreSQL native `tsvector`/`tsquery` and GIN indexes across Flags, Corrective Actions, Inspections, Notices, and Parliamentary Inquiries.
- **Global Header Search (`Ctrl + K`):** Instant search modal in the React topbar with keyboard shortcut support.

### 5. 📧 Email Notification System
- **Nodemailer Integration:** CIL-branded HTML email templates for Overdue Action Alerts, Critical Flags, Parliamentary Deadline Warnings, and Scheduled Daily Reports.

### 6. 📈 Apache ECharts Analytics Matrix
- **Interactive Subsidiary Dashboard:** Multi-bar & line chart visualizing Target vs Production vs Offtake vs Overburden Removal (OBR) across all 7 CIL subsidiaries.

### 7. 🐳 Air-Gapped Workflow Automation
- **Docker Compose Setup:** Full containerized stack including PostgreSQL, Redis, n8n Workflow Automation (port 5678), Node Backend, and Python ML Service.

---

## 🏗️ System Architecture

```text
                           ┌──────────────────────────────┐
                           │   CoalSetu React Frontend    │
                           │  (Vite + Tailwind CSS :5173) │
                           └──────────────┬───────────────┘
                                          │ REST & Auth (JWT)
                                          ▼
                           ┌──────────────────────────────┐
                           │      Node.js API Server      │
                           │     (Express + Prisma :5000) │
                           └──────┬───────────────┬───────┘
                                  │               │
            Prisma Schema / SQL   │               │ Internal REST / JSON
                                  ▼               ▼
           ┌────────────────────────┐   ┌─────────────────────────────┐
           │  PostgreSQL Database   │   │     FastAPI ML Engine       │
           │ (:5432 / embedded-pg)  │   │ (:8001 / PyTorch + OCR + ML)│
           └────────────────────────┘   └──────────────┬──────────────┘
                                                       │
                                                       ▼ (Local Ollama)
                                        ┌─────────────────────────────┐
                                        │  Ollama Local LLM (gemma3)  │
                                        │         (:11434)            │
                                        └─────────────────────────────┘
```

---

## 🚀 Quick Start & Installation

### 1. Prerequisites
- **Node.js**: `v18.x` or `v20.x`
- **Python**: `3.10` or `3.11`
- **Tesseract OCR**: Installed on system (Windows installer or `apt install tesseract-ocr`)
- **Ollama**: Local AI runner with `gemma3:1b` or `qwen2.5:3b` model downloaded

### 2. Fast Startup (Windows)
Run the automated batch script to launch all 3 services concurrently:
```cmd
.\start-all.bat
```
Or via PowerShell:
```powershell
powershell -ExecutionPolicy Bypass -File .\start-all.ps1
```

### 3. Manual Step-by-Step Setup

#### A. Backend Setup
```bash
cd Backend
npm install
npm run setup   # Prisma generate & DB bootstrap
npm run dev     # Runs on http://localhost:5000
```

#### B. ML Microservice Setup
```bash
cd ML
python -m venv venv
.\venv\Scripts\activate      # On Windows
pip install -r requirements.txt
python main.py               # Runs on http://localhost:8001
```

#### C. Frontend Setup
```bash
cd Frontend
npm install
npm run dev                  # Runs on http://localhost:5173
```

---

## 🔒 Security & Environment Configuration

### Backend `.env`
```env
PORT=5000
NODE_ENV=development
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/coalgov_db?schema=public"
JWT_ACCESS_SECRET="coalgov_super_secret_access_token_key_2026"
JWT_REFRESH_SECRET="coalgov_super_secret_refresh_token_key_2026"
JWT_ACCESS_EXPIRES_IN="30d"
JWT_REFRESH_EXPIRES_IN="60d"
ML_SERVICE_URL="http://localhost:8001"
```

---

## 📄 License & Attribution
Developed for Coal India Limited (CIL) subsidiaries, CMPDI, and the Ministry of Coal governance digitalization initiative.
