import os
import io
import re
import json
import time
import hashlib
import logging
from typing import List, Dict, Any, Optional
from PIL import Image
import pymupdf
import torch
from transformers import DonutProcessor, VisionEncoderDecoderModel
from config import DONUT_MODEL_NAME, MODELS_CACHE_DIR, EXTRACT_CACHE_DIR

logger = logging.getLogger("pdf_processor")
logger.setLevel(logging.INFO)

def _load_tesseract() -> tuple[Any, bool]:
    try:
        import pytesseract
    except ImportError:
        return None, False

    # Check if tesseract binary is accessible directly via PATH
    try:
        pytesseract.get_tesseract_version()
        return pytesseract, True
    except Exception:
        pass

    # Windows auto-discovery: check standard installation paths if PATH lookup failed
    if os.name == "nt":
        possible_paths = [
            r"C:\Program Files\Tesseract-OCR\tesseract.exe",
            r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
            os.path.expanduser(r"~\AppData\Local\Programs\Tesseract-OCR\tesseract.exe"),
            os.path.expanduser(r"~\AppData\Local\Tesseract-OCR\tesseract.exe"),
        ]
        for path in possible_paths:
            if os.path.exists(path):
                pytesseract.pytesseract.tesseract_cmd = path
                try:
                    pytesseract.get_tesseract_version()
                    logger.info(f"Auto-configured Tesseract binary at: {path}")
                    return pytesseract, True
                except Exception:
                    continue

    return pytesseract, False


pytesseract, TESSERACT_AVAILABLE = _load_tesseract()

if TESSERACT_AVAILABLE:
    logger.info("Tesseract OCR is available and loaded.")
else:
    logger.warning("Tesseract executable or pytesseract is unavailable. OCR text extraction is disabled.")


# Global singletons
_PROCESSOR: Optional[DonutProcessor] = None
_MODEL: Optional[VisionEncoderDecoderModel] = None
_DEVICE: str = "cpu"
_MEMORY_CACHE: Dict[str, Dict[str, Any]] = {}

os.makedirs(MODELS_CACHE_DIR, exist_ok=True)
os.makedirs(EXTRACT_CACHE_DIR, exist_ok=True)


def get_donut_pipeline():
    """
    Singleton loader for DonutProcessor and VisionEncoderDecoderModel.
    Cached locally in MODELS_CACHE_DIR so subsequent startups run fully offline.
    """
    global _PROCESSOR, _MODEL, _DEVICE

    if _PROCESSOR is not None and _MODEL is not None:
        return _PROCESSOR, _MODEL, _DEVICE

    model_dir = os.path.join(MODELS_CACHE_DIR, DONUT_MODEL_NAME.replace("/", "_"))
    os.makedirs(model_dir, exist_ok=True)

    _DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
    logger.info(f"Loading Donut model ({DONUT_MODEL_NAME}) on {_DEVICE}...")
    start_time = time.time()

    is_local = os.path.exists(os.path.join(model_dir, "config.json")) or os.environ.get("HF_HUB_OFFLINE") == "1"

    try:
        if is_local:
            logger.info(f"Loading Donut model from local offline directory: {model_dir}")
            _PROCESSOR = DonutProcessor.from_pretrained(model_dir, local_files_only=True)
            _MODEL = VisionEncoderDecoderModel.from_pretrained(model_dir, local_files_only=True)
        else:
            logger.info(f"Downloading/loading Donut model: {DONUT_MODEL_NAME} (cache: {MODELS_CACHE_DIR})")
            _PROCESSOR = DonutProcessor.from_pretrained(DONUT_MODEL_NAME, cache_dir=MODELS_CACHE_DIR)
            _MODEL = VisionEncoderDecoderModel.from_pretrained(DONUT_MODEL_NAME, cache_dir=MODELS_CACHE_DIR)
            
            logger.info(f"Saving offline snapshot to {model_dir}...")
            _PROCESSOR.save_pretrained(model_dir)
            _MODEL.save_pretrained(model_dir)

    except Exception as e:
        logger.error(f"Error loading Donut model: {e}")
        if is_local:
            logger.info("Retrying with remote hub download...")
            _PROCESSOR = DonutProcessor.from_pretrained(DONUT_MODEL_NAME, cache_dir=MODELS_CACHE_DIR)
            _MODEL = VisionEncoderDecoderModel.from_pretrained(DONUT_MODEL_NAME, cache_dir=MODELS_CACHE_DIR)
            _PROCESSOR.save_pretrained(model_dir)
            _MODEL.save_pretrained(model_dir)
        else:
            raise e

    _MODEL.to(_DEVICE)
    _MODEL.eval()
    logger.info(f"Donut model loaded successfully in {time.time() - start_time:.2f}s on {_DEVICE}.")
    return _PROCESSOR, _MODEL, _DEVICE


def render_document_page(file_bytes: bytes, filename: str, page_num: int = 0):
    """
    Renders the specified page of a PDF or image into a PIL Image.
    Returns (PIL Image, total_pages).
    """
    ext = os.path.splitext(filename)[1].lower()
    
    if ext in [".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff"]:
        image = Image.open(io.BytesIO(file_bytes)).convert("RGB")
        return image, 1

    doc = pymupdf.open(stream=file_bytes, filetype="pdf")
    total_pages = len(doc)
    if total_pages == 0:
        doc.close()
        raise ValueError("PDF document contains no pages")

    page_num = _normalize_page_num(page_num, total_pages)

    page = doc[page_num]
    pix = page.get_pixmap(dpi=150)
    image = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
    doc.close()
    return image, total_pages


def _normalize_page_num(page_num: int, total_pages: int) -> int:
    return page_num if 0 <= page_num < total_pages else 0


def compute_cache_key(file_bytes: bytes, fields: list, page_num: int) -> str:
    """Computes SHA-256 hash of document bytes and field schema."""
    h = hashlib.sha256()
    h.update(file_bytes)
    schema_str = f"page:{page_num}:" + ",".join(sorted(f.strip().lower() for f in fields))
    h.update(schema_str.encode("utf-8"))
    return h.hexdigest()


def get_cached_extraction(cache_key: str):
    """Retrieves cached result from memory or disk."""
    if cache_key in _MEMORY_CACHE:
        return _MEMORY_CACHE[cache_key]
    
    disk_path = os.path.join(EXTRACT_CACHE_DIR, f"{cache_key}.json")
    if os.path.exists(disk_path):
        try:
            with open(disk_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                _MEMORY_CACHE[cache_key] = data
                return data
        except Exception as e:
            logger.warning(f"Failed to read disk cache {disk_path}: {e}")
    return None


def save_cached_extraction(cache_key: str, data: dict):
    """Saves extraction result to memory and disk."""
    _MEMORY_CACHE[cache_key] = data
    disk_path = os.path.join(EXTRACT_CACHE_DIR, f"{cache_key}.json")
    try:
        with open(disk_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        logger.warning(f"Failed to save disk cache {disk_path}: {e}")


def clean_extracted_value(val: str) -> str:
    """Cleans Donut XML tags and normalizes answer text."""
    if not val:
        return ""
    cleaned = re.sub(r"</?[^>]+>", "", val).strip()
    return cleaned


def extract_fields_from_document(
    file_bytes: bytes,
    filename: str,
    fields: list,
    page_num: int = 0,
    use_cache: bool = True,
) -> dict:
    """
    Extracts structured fields from a PDF or document image using offline Donut DocVQA.
    Includes SHA-256 caching for instantaneous repeats.
    """
    if not fields:
        return {"extracted_fields": {}, "error": "No fields requested"}

    cache_key = compute_cache_key(file_bytes, fields, page_num)
    if use_cache:
        cached = get_cached_extraction(cache_key)
        if cached:
            return {
                **cached,
                "cached": True,
                "cache_key": cache_key,
            }

    start_time = time.time()
    processor, model, device = get_donut_pipeline()

    image, total_pages = render_document_page(file_bytes, filename, page_num=page_num)

    pixel_values = processor(image, return_tensors="pt").pixel_values
    pixel_values = pixel_values.to(device)

    extracted_results = {}

    for field in fields:
        field_clean = field.strip()
        if not field_clean:
            continue

        prompt = f"<s_docvqa><s_question>What is the {field_clean}?</s_question><s_answer>"
        decoder_input_ids = processor.tokenizer(
            prompt,
            add_special_tokens=False,
            return_tensors="pt"
        ).input_ids.to(device)

        with torch.no_grad():
            outputs = model.generate(
                pixel_values,
                decoder_input_ids=decoder_input_ids,
                max_new_tokens=48,
                pad_token_id=processor.tokenizer.pad_token_id,
                eos_token_id=processor.tokenizer.eos_token_id,
                use_cache=True,
                num_beams=1,
                bad_words_ids=[[processor.tokenizer.unk_token_id]],
                return_dict_in_generate=True,
            )

        seq = processor.batch_decode(outputs.sequences)[0]
        seq = seq.replace(processor.tokenizer.eos_token, "").replace(processor.tokenizer.pad_token, "")

        match = re.search(r"<s_answer>(.*?)(?:</s_answer>|$)", seq, flags=re.DOTALL)
        if match:
            raw_answer = match.group(1)
        else:
            raw_answer = seq.split("<s_answer>")[-1] if "<s_answer>" in seq else seq

        extracted_results[field_clean] = clean_extracted_value(raw_answer)

    elapsed_ms = int((time.time() - start_time) * 1000)

    result_data = {
        "filename": filename,
        "page": page_num + 1,
        "total_pages": total_pages,
        "extracted_fields": extracted_results,
        "inference_time_ms": elapsed_ms,
        "cached": False,
        "cache_key": cache_key,
    }

    if use_cache:
        save_cached_extraction(cache_key, result_data)

    return result_data


# ============================================================
# Tesseract OCR — Universal Multi-Language Text Extraction
# ============================================================

# Discover all installed Tesseract language packs on startup
_INSTALLED_LANGS: List[str] = []

def _discover_tesseract_languages() -> List[str]:
    """Queries Tesseract binary for all installed language packs."""
    global _INSTALLED_LANGS
    if not TESSERACT_AVAILABLE:
        return []
    try:
        langs = pytesseract.get_languages(config="")
        # Filter out 'osd' (orientation/script detection) from lang list
        _INSTALLED_LANGS = [l for l in langs if l != "osd"]
        logger.info(f"Tesseract installed languages ({len(_INSTALLED_LANGS)}): {_INSTALLED_LANGS}")
        return _INSTALLED_LANGS
    except Exception as e:
        logger.warning(f"Could not detect Tesseract languages: {e}.")
        _INSTALLED_LANGS = []
        return []

# Run discovery at import time
_discover_tesseract_languages()


def get_available_languages() -> Dict[str, Any]:
    """Returns info about Tesseract installation and available language packs."""
    if not TESSERACT_AVAILABLE:
        return {
            "available": False,
            "error": "Tesseract executable or pytesseract is unavailable",
            "languages": [],
        }
    try:
        version_str = str(pytesseract.get_tesseract_version())
        languages = _INSTALLED_LANGS or [
            language for language in pytesseract.get_languages(config="") if language != "osd"
        ]
    except Exception as e:
        return {"available": False, "error": str(e), "languages": []}

    return {
        "available": bool(languages),
        "version": version_str,
        "languages": languages,
        "total_languages": len(languages),
    }


def resolve_ocr_lang(lang: str) -> str:
    """
    Resolves the language parameter for Tesseract:
    - 'auto' → uses ALL installed languages (Tesseract picks best per character)
    - specific lang code (e.g. 'hin', 'eng+hin') → validated against installed packs
    - unknown lang → falls back to 'eng' or whatever is installed
    """
    if not _INSTALLED_LANGS:
        _discover_tesseract_languages()

    if not _INSTALLED_LANGS:
        raise RuntimeError("No Tesseract language packs are available")

    if lang.lower() == "auto":
        # Use all installed languages — Tesseract will auto-detect per character
        return "+".join(_INSTALLED_LANGS)

    # User specified explicit langs like "eng+hin+ben"
    requested = [l.strip() for l in lang.split("+") if l.strip()]
    valid_langs = [l for l in requested if l in _INSTALLED_LANGS]

    if not valid_langs:
        logger.warning(
            f"Requested lang(s) {requested} not found in installed: {_INSTALLED_LANGS}. "
            f"Using all installed languages."
        )
        return "+".join(_INSTALLED_LANGS)

    if len(valid_langs) < len(requested):
        missing = [l for l in requested if l not in _INSTALLED_LANGS]
        logger.warning(f"Some requested langs not installed: {missing}. Using: {valid_langs}")

    return "+".join(valid_langs)


def detect_script_from_image(image: Image.Image) -> Optional[str]:
    """
    Uses Tesseract's OSD (Orientation & Script Detection) to detect
    the dominant script in an image. Returns the detected script name
    or None if detection fails.
    """
    if not TESSERACT_AVAILABLE:
        return None
    try:
        osd_data = pytesseract.image_to_osd(image, output_type=pytesseract.Output.DICT)
        script = osd_data.get("script", None)
        confidence = osd_data.get("script_conf", 0)
        if script and confidence > 0.5:
            logger.info(f"Detected script: {script} (confidence: {confidence})")
            return script
    except Exception as e:
        logger.debug(f"OSD script detection failed (normal for small images): {e}")
    return None


# Mapping from Tesseract script names to language codes
_SCRIPT_TO_LANG = {
    "Latin": "eng",
    "Devanagari": "hin+mar+san+nep",
    "Bengali": "ben",
    "Gujarati": "guj",
    "Gurmukhi": "pan",
    "Kannada": "kan",
    "Malayalam": "mal",
    "Oriya": "ori",
    "Tamil": "tam",
    "Telugu": "tel",
    "Arabic": "ara+urd",
    "Cyrillic": "rus",
    "Han": "chi_sim+chi_tra",
    "Hangul": "kor",
    "Japanese": "jpn",
    "Thai": "tha",
    "Georgian": "kat",
    "Armenian": "hye",
    "Hebrew": "heb",
    "Greek": "ell",
    "Tibetan": "bod",
    "Sinhala": "sin",
    "Myanmar": "mya",
    "Khmer": "khm",
    "Lao": "lao",
    "Ethiopic": "amh+tir",
}


def _resolve_script_to_lang(script: Optional[str]) -> Optional[str]:
    """Maps a detected script name to Tesseract language codes, filtered by installed packs."""
    if not script:
        return None
    candidates = _SCRIPT_TO_LANG.get(script, "")
    if not candidates:
        return None
    # Filter to only installed languages
    requested = [l.strip() for l in candidates.split("+") if l.strip()]
    valid = [l for l in requested if l in _INSTALLED_LANGS]
    return "+".join(valid) if valid else None


def ocr_extract_text_from_image(image: Image.Image, lang: str = "auto") -> str:
    """
    Extracts full text from a PIL Image using Tesseract OCR.
    
    lang='auto' (default): Auto-detects the script/language in the image and
    uses the best matching installed language packs. Falls back to using ALL
    installed languages for maximum coverage.
    
    Supports any language that has a Tesseract language pack installed.
    """
    if not TESSERACT_AVAILABLE:
        raise RuntimeError("Tesseract executable or pytesseract is unavailable")

    try:
        if lang.lower() == "auto":
            # Step 1: Try script detection to narrow down languages
            detected_script = detect_script_from_image(image)
            script_lang = _resolve_script_to_lang(detected_script)

            if script_lang:
                # Always include 'eng' alongside detected script for mixed documents
                if "eng" in _INSTALLED_LANGS and "eng" not in script_lang:
                    resolved_lang = f"eng+{script_lang}"
                else:
                    resolved_lang = script_lang
                logger.info(f"Auto-detected script '{detected_script}' → using lang: {resolved_lang}")
            else:
                # Fallback: use all installed languages
                resolved_lang = resolve_ocr_lang("auto")
                logger.info(f"Script detection inconclusive → using all langs: {resolved_lang}")
        else:
            resolved_lang = resolve_ocr_lang(lang)

        text = pytesseract.image_to_string(image, lang=resolved_lang)
        return text.strip()

    except pytesseract.TesseractError as e:
        error_msg = str(e)
        # If the lang string caused an error (missing pack), retry with just 'eng'
        if "Failed loading language" in error_msg or "Tesseract Open Source OCR Engine" in error_msg:
            logger.warning(f"Lang '{lang}' failed, retrying with 'eng' only: {e}")
            try:
                text = pytesseract.image_to_string(image, lang="eng")
                return text.strip()
            except Exception as e2:
                logger.error(f"Tesseract fallback OCR also failed: {e2}")
                raise RuntimeError(f"Tesseract OCR failed: {e2}") from e2
        logger.error(f"Tesseract OCR error: {e}")
        raise RuntimeError(f"Tesseract OCR failed: {e}") from e
    except Exception as e:
        logger.error(f"Tesseract OCR error: {e}")
        raise RuntimeError(f"Tesseract OCR failed: {e}") from e


def ocr_extract_text_from_page(
    file_bytes: bytes,
    filename: str,
    page_num: int = 0,
    lang: str = "auto",
    dpi: int = 300,
) -> Dict[str, Any]:
    """
    Renders a single page of a PDF/image at the specified DPI,
    then runs Tesseract OCR for full text extraction.
    lang='auto' auto-detects the language. Uses SHA-256 caching.
    """
    if not TESSERACT_AVAILABLE:
        return {"text": "", "error": "Tesseract OCR not available"}

    cache_key = "ocr_" + compute_cache_key(file_bytes, [f"ocr_page_{page_num}_dpi_{dpi}_lang_{lang}"], page_num)
    cached = get_cached_extraction(cache_key)
    if cached:
        return {**cached, "cached": True, "cache_key": cache_key}

    start_time = time.time()

    ext = os.path.splitext(filename)[1].lower()
    if ext in [".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff"]:
        image = Image.open(io.BytesIO(file_bytes)).convert("RGB")
        total_pages = 1
    else:
        doc = pymupdf.open(stream=file_bytes, filetype="pdf")
        total_pages = len(doc)
        if total_pages == 0:
            doc.close()
            return {"text": "", "error": "PDF contains no pages"}
        page_num = _normalize_page_num(page_num, total_pages)
        page = doc[page_num]
        pix = page.get_pixmap(dpi=dpi)
        image = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
        doc.close()

    text = ocr_extract_text_from_image(image, lang=lang)
    resolved = resolve_ocr_lang(lang)
    elapsed_ms = int((time.time() - start_time) * 1000)

    result = {
        "filename": filename,
        "page": page_num + 1,
        "total_pages": total_pages,
        "text": text,
        "char_count": len(text),
        "word_count": len(text.split()) if text else 0,
        "ocr_engine": "tesseract",
        "lang_requested": lang,
        "lang_resolved": resolved,
        "dpi": dpi,
        "inference_time_ms": elapsed_ms,
        "cached": False,
        "cache_key": cache_key,
    }

    save_cached_extraction(cache_key, result)
    return result


def ocr_extract_full_document(
    file_bytes: bytes,
    filename: str,
    lang: str = "auto",
    dpi: int = 300,
    max_pages: int = 50,
) -> Dict[str, Any]:
    """
    Extracts text from ALL pages of a PDF using Tesseract OCR.
    lang='auto' auto-detects language per page.
    Returns combined text and per-page breakdown.
    """
    if max_pages <= 0:
        return {"pages": [], "full_text": "", "error": "max_pages must be greater than zero"}
    if not TESSERACT_AVAILABLE:
        return {"pages": [], "full_text": "", "error": "Tesseract OCR not available"}

    start_time = time.time()

    ext = os.path.splitext(filename)[1].lower()
    if ext in [".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff"]:
        page_result = ocr_extract_text_from_page(file_bytes, filename, 0, lang, dpi)
        return {
            "filename": filename,
            "total_pages": 1,
            "pages": [{"page": 1, "text": page_result.get("text", "")}],
            "full_text": page_result.get("text", ""),
            "ocr_engine": "tesseract",
            "lang_requested": lang,
            "inference_time_ms": int((time.time() - start_time) * 1000),
        }

    doc = pymupdf.open(stream=file_bytes, filetype="pdf")
    if len(doc) == 0:
        doc.close()
        return {"pages": [], "full_text": "", "error": "PDF contains no pages"}
    total_pages = min(len(doc), max_pages)
    pages_data = []
    all_text_parts = []

    for i in range(total_pages):
        page = doc[i]
        pix = page.get_pixmap(dpi=dpi)
        image = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
        page_text = ocr_extract_text_from_image(image, lang=lang)
        pages_data.append({"page": i + 1, "text": page_text})
        all_text_parts.append(page_text)

    doc.close()
    full_text = "\n\n--- Page Break ---\n\n".join(all_text_parts)
    elapsed_ms = int((time.time() - start_time) * 1000)

    return {
        "filename": filename,
        "total_pages": total_pages,
        "pages": pages_data,
        "full_text": full_text,
        "char_count": len(full_text),
        "word_count": len(full_text.split()) if full_text else 0,
        "ocr_engine": "tesseract",
        "lang_requested": lang,
        "dpi": dpi,
        "inference_time_ms": elapsed_ms,
    }


def hybrid_extract(
    file_bytes: bytes,
    filename: str,
    fields: list = None,
    page_num: int = 0,
    lang: str = "auto",
) -> Dict[str, Any]:
    """
    Hybrid extraction combining:
    1. Donut DocVQA — for structured field extraction (targeted Q&A)
    2. Tesseract OCR — for full-text extraction (complete page text)

    lang='auto' auto-detects language for OCR.
    Returns both results together for maximum coverage.
    """
    result = {
        "filename": filename,
        "page": page_num + 1,
        "donut_fields": {},
        "ocr_full_text": "",
    }

    # Donut field extraction
    if fields:
        donut_result = extract_fields_from_document(
            file_bytes, filename, fields, page_num
        )
        result["donut_fields"] = donut_result.get("extracted_fields", {})
        result["donut_inference_ms"] = donut_result.get("inference_time_ms", 0)
        result["donut_cached"] = donut_result.get("cached", False)

    # Tesseract full-text OCR (universal language)
    if TESSERACT_AVAILABLE:
        ocr_result = ocr_extract_text_from_page(
            file_bytes, filename, page_num, lang=lang
        )
        result["ocr_full_text"] = ocr_result.get("text", "")
        result["ocr_lang_resolved"] = ocr_result.get("lang_resolved", lang)
        result["ocr_inference_ms"] = ocr_result.get("inference_time_ms", 0)
        result["ocr_cached"] = ocr_result.get("cached", False)
    else:
        result["ocr_full_text"] = ""
        result["ocr_error"] = "Tesseract not available"

    return result
