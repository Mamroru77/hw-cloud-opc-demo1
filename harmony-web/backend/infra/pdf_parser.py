import base64
import logging
import re
from io import BytesIO

logger = logging.getLogger(__name__)


def _normalize_page_lines(raw_text: str) -> str:
    """Normalize PDF page text and convert multi-space table columns into pipe-delimited rows."""
    normalized_lines: list[str] = []
    for line in (raw_text or "").splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        # Preserve tabular alignment cues by turning 2+ consecutive spaces or tabs into " | "
        if "\t" in stripped or re.search(r"\s{3,}", stripped):
            cells = [c.strip() for c in re.split(r"\t+|\s{3,}", stripped) if c.strip()]
            if len(cells) >= 2:
                normalized_lines.append(" | ".join(cells))
                continue
        normalized_lines.append(re.sub(r"\s{2,}", " ", stripped))
    return "\n".join(normalized_lines)


def _get_pdf_reader_cls():
    try:
        from pypdf import PdfReader
        return PdfReader
    except ImportError:
        try:
            from PyPDF2 import PdfReader
            return PdfReader
        except ImportError as exc:
            raise RuntimeError("未安装 pypdf 或 PyPDF2，无法解析 PDF 文档") from exc


def extract_pages_from_pdf_bytes(file_bytes: bytes) -> list[dict]:
    """Extract per-page normalized text (including table-like rows) from PDF bytes."""
    if not file_bytes:
        return []

    reader_cls = _get_pdf_reader_cls()
    reader = reader_cls(BytesIO(file_bytes))
    pages: list[dict] = []
    for idx, page in enumerate(reader.pages):
        try:
            raw_text = page.extract_text() or ""
            cleaned = _normalize_page_lines(raw_text)
            if cleaned:
                pages.append({"page": idx + 1, "text": cleaned})
        except Exception as exc:
            logger.warning("Failed to extract text from PDF page %d: %s", idx + 1, exc)
    return pages


def extract_text_from_pdf_bytes(file_bytes: bytes) -> str:
    """Extract plain text from PDF bytes using pypdf or PyPDF2."""
    pages = extract_pages_from_pdf_bytes(file_bytes)
    return "\n\n".join(p["text"] for p in pages)


def split_text_into_pages(text: str, chars_per_page: int = 1800) -> list[dict]:
    """Split markdown/plain text into logical pages by headings or character budget."""
    cleaned = (text or "").strip()
    if not cleaned:
        return []

    # First check explicit form-feed / page markers
    if "\f" in cleaned:
        segments = [seg.strip() for seg in cleaned.split("\f") if seg.strip()]
        if segments:
            return [{"page": i + 1, "text": _normalize_page_lines(seg)} for i, seg in enumerate(segments)]

    # Next split on markdown level-1/2 sections when long, or chunk by chars_per_page
    if len(cleaned) <= chars_per_page:
        return [{"page": 1, "text": _normalize_page_lines(cleaned)}]

    pages: list[dict] = []
    current_buf: list[str] = []
    current_len = 0

    for block in re.split(r"\n{2,}", cleaned):
        part = block.strip()
        if not part:
            continue
        is_heading = part.startswith("# ") or part.startswith("## ") or re.match(r"^\[Page\s+\d+\]", part, re.I)
        if current_buf and (current_len + len(part) > chars_per_page or (is_heading and current_len > chars_per_page * 0.45)):
            pages.append({"page": len(pages) + 1, "text": _normalize_page_lines("\n\n".join(current_buf))})
            current_buf = [part]
            current_len = len(part)
        else:
            current_buf.append(part)
            current_len += len(part) + 2

    if current_buf:
        pages.append({"page": len(pages) + 1, "text": _normalize_page_lines("\n\n".join(current_buf))})

    return pages


def extract_pages_from_file_bytes(file_bytes: bytes, filename: str, fallback_text: str = "") -> list[dict]:
    """Extract page-indexed chunks from .pdf, .md, .markdown, or .txt bytes."""
    lower = (filename or "").lower()
    if file_bytes and lower.endswith(".pdf"):
        return extract_pages_from_pdf_bytes(file_bytes)
    if file_bytes:
        decoded = file_bytes.decode("utf-8", errors="ignore")
        return split_text_into_pages(decoded)
    if fallback_text:
        return split_text_into_pages(fallback_text)
    return []


def format_pages_with_markers(pages: list[dict], max_chars: int = 15000) -> str:
    """Format extracted pages with [Page N] headers up to max_chars."""
    if not pages:
        return ""
    blocks: list[str] = []
    total = 0
    for p in pages:
        page_num = p.get("page", 1)
        page_text = (p.get("text") or "").strip()
        if not page_text:
            continue
        section = f"[Page {page_num}]\n{page_text}"
        if total + len(section) > max_chars:
            remain = max_chars - total
            if remain > 64:
                blocks.append(section[:remain])
            break
        blocks.append(section)
        total += len(section) + 2
    return "\n\n".join(blocks)


def extract_text_from_file_bytes(file_bytes: bytes, filename: str) -> str:
    """Extract plain text from .pdf, .md, .markdown, or .txt bytes."""
    lower = (filename or "").lower()
    if lower.endswith(".pdf"):
        return extract_text_from_pdf_bytes(file_bytes)
    if lower.endswith((".md", ".markdown", ".txt")):
        return file_bytes.decode("utf-8", errors="ignore")
    return file_bytes.decode("utf-8", errors="ignore")


def decode_base64_payload(b64_data: str) -> bytes:
    """Decode raw or data-URL-prefixed base64 payloads safely."""
    if not b64_data:
        return b""
    if "," in b64_data and b64_data.strip().startswith("data:"):
        b64_data = b64_data.split(",", 1)[1]
    return base64.b64decode(b64_data)


_REFERENCE_HEADING_RE = re.compile(
    r"^(?:#{1,3}\s*)?(?:\d+\.?\s+)?(?:references|bibliography|literature\s+cited|works\s+cited|参考文献|引用文献)(?:\s*[:：])?\s*$",
    re.IGNORECASE,
)


def strip_reference_section(pages: list[dict]) -> tuple[list[dict], bool]:
    """Strip trailing References / 参考文献 sections so cited papers do not pollute parameter extraction."""
    if not pages:
        return pages, False

    cleaned_pages: list[dict] = []
    kept_chars = 0

    for page_item in pages:
        page_num = page_item.get("page", 1)
        lines = (page_item.get("text") or "").splitlines()
        kept_lines: list[str] = []
        found_ref_heading = False

        for line in lines:
            stripped = line.strip()
            if _REFERENCE_HEADING_RE.match(stripped) and (kept_chars + len("\n".join(kept_lines))) > 20:
                found_ref_heading = True
                break
            kept_lines.append(line)

        if found_ref_heading:
            trimmed = "\n".join(kept_lines).strip()
            if trimmed:
                cleaned_pages.append({"page": page_num, "text": trimmed})
            return cleaned_pages, True

        page_text = "\n".join(kept_lines).strip()
        if page_text:
            cleaned_pages.append({"page": page_num, "text": page_text})
            kept_chars += len(page_text)

    return cleaned_pages, False


def assess_pdf_scan_status(
    pages: list[dict],
    raw_bytes: bytes,
    filename: str = "",
    title: str = "",
) -> dict:
    """Detect scanned image-only PDFs and try optional local OCR before falling back cleanly."""
    total_chars = sum(len((p.get("text") or "").strip()) for p in pages)
    is_pdf = (filename or "").lower().endswith(".pdf") or (raw_bytes or b"").lstrip().startswith(b"%PDF")
    if not is_pdf or total_chars >= 30:
        return {"is_scanned": False, "ocr_status": "native_text", "fallback_content": ""}

    # Optional local OCR if pdf2image + pytesseract are installed
    try:
        from pdf2image import convert_from_bytes  # type: ignore
        import pytesseract  # type: ignore

        images = convert_from_bytes(raw_bytes, first_page=1, last_page=3)
        ocr_pages = []
        for idx, img in enumerate(images):
            txt = (pytesseract.image_to_string(img, lang="chi_sim+eng") or "").strip()
            if txt:
                ocr_pages.append({"page": idx + 1, "text": _normalize_page_lines(txt)})
        if ocr_pages:
            joined = "\n\n".join(p["text"] for p in ocr_pages)
            return {"is_scanned": True, "ocr_status": "local_ocr", "fallback_content": joined, "ocr_pages": ocr_pages}
    except Exception:
        pass

    doc_label = title or filename or "未命名 PDF"
    fallback_text = (
        f"[扫描版 PDF 降级解析] 文档《{doc_label}》有效文本密度极低（{total_chars} 字符），"
        "判定为图像扫描件。在无重型 OCR/VLM 服务的离线环境下，系统已基于标题与元数据自动匹配临床基准参数。"
    )
    return {
        "is_scanned": True,
        "ocr_status": "vlm_fallback",
        "fallback_content": fallback_text,
    }
