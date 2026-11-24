import io
import re
import zipfile
from xml.sax.saxutils import escape

DOMAIN_LABEL_MAP = {
    "devices": "医疗器械与成像分子",
    "drugs": "创新药物与生物治疗",
    "ai": "医疗 AI 与智能诊断 (SaMD)",
    "surgical": "创新临床术式与疗法",
}

CONTENT_TYPES_XML = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>
</Types>
"""

PACKAGE_RELS_XML = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>
"""

DOCUMENT_RELS_XML = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>
</Relationships>
"""

STYLES_XML = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Calibri" w:eastAsia="Microsoft YaHei" w:hAnsi="Calibri"/>
        <w:sz w:val="21"/>
        <w:szCs w:val="21"/>
        <w:color w:val="1E293B"/>
      </w:rPr>
    </w:rPrDefault>
    <w:pPrDefault>
      <w:pPr>
        <w:spacing w:after="120" w:line="320" w:lineRule="auto"/>
      </w:pPr>
    </w:pPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:qFormat/>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
    <w:basedOn w:val="Normal"/>
    <w:qFormat/>
    <w:pPr>
      <w:spacing w:before="200" w:after="160" w:line="320" w:lineRule="auto"/>
      <w:pBdr>
        <w:bottom w:val="single" w:sz="8" w:space="6" w:color="CBD5E1"/>
      </w:pBdr>
    </w:pPr>
    <w:rPr>
      <w:b/>
      <w:color w:val="0F172A"/>
      <w:sz w:val="34"/>
      <w:szCs w:val="34"/>
    </w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="heading 2"/>
    <w:basedOn w:val="Normal"/>
    <w:qFormat/>
    <w:pPr>
      <w:spacing w:before="220" w:after="100" w:line="300" w:lineRule="auto"/>
    </w:pPr>
    <w:rPr>
      <w:b/>
      <w:color w:val="1D4ED8"/>
      <w:sz w:val="26"/>
      <w:szCs w:val="26"/>
    </w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading3">
    <w:name w:val="heading 3"/>
    <w:basedOn w:val="Normal"/>
    <w:qFormat/>
    <w:pPr>
      <w:spacing w:before="140" w:after="80"/>
    </w:pPr>
    <w:rPr>
      <w:b/>
      <w:color w:val="0F172A"/>
      <w:sz w:val="23"/>
      <w:szCs w:val="23"/>
    </w:rPr>
  </w:style>
</w:styles>
"""


def _strip_leading_emoji(text: str) -> str:
    return re.sub(r"^[\U0001F300-\U0001FAFF\u2600-\u27BF\s]+", "", text).strip() or text


def _build_runs_xml(text: str, force_bold: bool = False) -> str:
    parts = re.split(r"(\*\*[^*]+\*\*)", text)
    runs: list[str] = []
    for part in parts:
        if not part:
            continue
        is_bold = force_bold
        content = part
        if part.startswith("**") and part.endswith("**") and len(part) > 4:
            is_bold = True
            content = part[2:-2]
        content = content.replace("`", "")
        rpr = "<w:rPr><w:b/></w:rPr>" if is_bold else ""
        runs.append(f'<w:r>{rpr}<w:t xml:space="preserve">{escape(content)}</w:t></w:r>')
    return "".join(runs) if runs else '<w:r><w:t xml:space="preserve"></w:t></w:r>'


def _build_paragraph_xml(
    text: str,
    style: str = "Normal",
    indent_left: int = 0,
    prefix: str = "",
    force_bold: bool = False,
) -> str:
    ppr_parts = [f'<w:pStyle w:val="{style}"/>']
    if indent_left > 0:
        ppr_parts.append(f'<w:ind w:left="{indent_left}"/>')
    ppr = f"<w:pPr>{''.join(ppr_parts)}</w:pPr>"
    runs = _build_runs_xml(f"{prefix}{text}", force_bold=force_bold)
    return f"<w:p>{ppr}{runs}</w:p>"


def markdown_to_docx_bytes(title: str, markdown_text: str, domain: str = "devices") -> bytes:
    """Convert structured Markdown text into a valid ECMA-376 OpenXML .docx binary."""
    domain_label = DOMAIN_LABEL_MAP.get(domain, "转化医学")
    paragraphs: list[str] = []

    lines = (markdown_text or "").splitlines()
    has_h1 = any(line.strip().startswith("# ") for line in lines)
    if not has_h1 and title.strip():
        paragraphs.append(_build_paragraph_xml(_strip_leading_emoji(title.strip()), style="Heading1"))

    paragraphs.append(
        _build_paragraph_xml(
            f"所属转化领域：{domain_label}  |  生成平台：云脉·智慧医疗 OPC 工作站",
            style="Normal",
        )
    )

    for raw_line in lines:
        line = raw_line.strip()
        if not line:
            continue
        if line.startswith("# "):
            paragraphs.append(_build_paragraph_xml(_strip_leading_emoji(line[2:].strip()), style="Heading1"))
        elif line.startswith("## "):
            paragraphs.append(_build_paragraph_xml(_strip_leading_emoji(line[3:].strip()), style="Heading2"))
        elif line.startswith("### "):
            paragraphs.append(_build_paragraph_xml(_strip_leading_emoji(line[4:].strip()), style="Heading3"))
        elif re.match(r"^[-*]\s+", line):
            item_text = re.sub(r"^[-*]\s+", "", line)
            paragraphs.append(_build_paragraph_xml(item_text, style="Normal", indent_left=360, prefix="• "))
        elif re.match(r"^\d+\.\s+", line):
            m = re.match(r"^(\d+\.)\s+(.*)$", line)
            if m:
                paragraphs.append(
                    _build_paragraph_xml(m.group(2), style="Normal", indent_left=360, prefix=f"{m.group(1)} ")
                )
        else:
            paragraphs.append(_build_paragraph_xml(line, style="Normal"))

    header_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
        '<w:p><w:pPr><w:jc w:val="right"/></w:pPr>'
        '<w:r><w:rPr><w:color w:val="64748B"/><w:sz w:val="18"/></w:rPr>'
        '<w:t xml:space="preserve">云脉·智慧医疗 转化医学工作站 | 专业导出文档</w:t>'
        '</w:r></w:p></w:hdr>'
    )

    document_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" '
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
        "<w:body>"
        f"{''.join(paragraphs)}"
        "<w:sectPr>"
        '<w:headerReference w:type="default" r:id="rId2"/>'
        '<w:pgSz w:w="11906" w:h="16838"/>'
        '<w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720"/>'
        "</w:sectPr>"
        "</w:body>"
        "</w:document>"
    )

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("[Content_Types].xml", CONTENT_TYPES_XML.encode("utf-8"))
        zf.writestr("_rels/.rels", PACKAGE_RELS_XML.encode("utf-8"))
        zf.writestr("word/_rels/document.xml.rels", DOCUMENT_RELS_XML.encode("utf-8"))
        zf.writestr("word/styles.xml", STYLES_XML.encode("utf-8"))
        zf.writestr("word/header1.xml", header_xml.encode("utf-8"))
        zf.writestr("word/document.xml", document_xml.encode("utf-8"))

    return buf.getvalue()
