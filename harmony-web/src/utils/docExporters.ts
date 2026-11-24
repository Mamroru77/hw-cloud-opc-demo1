import { exportDocxFromBackend } from '../lib/api';
import { FRONTEND_KNOWLEDGE_BASE } from '../lib/constants';
import type { AppParams, ParamCitation } from '../lib/types';

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function triggerBlobDownload(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// CRC32 lookup for offline OpenXML ZIP (.docx) packaging
const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC32_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function buildStoredZip(entries: Array<{ name: string; data: Uint8Array }>): Blob {
  const encoder = new TextEncoder();
  const localChunks: Uint8Array[] = [];
  const centralChunks: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const data = entry.data;
    const crc = crc32(data);

    const localHeader = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(localHeader.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0x0800, true);
    lv.setUint16(8, 0, true); // STORE
    lv.setUint16(10, 0, true);
    lv.setUint16(12, 0, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, data.length, true);
    lv.setUint32(22, data.length, true);
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true);
    localHeader.set(nameBytes, 30);

    localChunks.push(localHeader, data);

    const centralHeader = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(centralHeader.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, 0, true);
    cv.setUint16(14, 0, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, data.length, true);
    cv.setUint32(24, data.length, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true);
    cv.setUint16(36, 0, true);
    cv.setUint32(38, 0, true);
    cv.setUint32(42, offset, true);
    centralHeader.set(nameBytes, 46);

    centralChunks.push(centralHeader);
    offset += localHeader.length + data.length;
  }

  const centralSize = centralChunks.reduce((acc, c) => acc + c.length, 0);
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);
  ev.setUint16(20, 0, true);

  const parts: BlobPart[] = [...localChunks, ...centralChunks, eocd].map(
    (u8) => u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength) as ArrayBuffer
  );

  return new Blob(parts, {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

function buildOfflineDocxBlob(title: string, markdownText: string): Blob {
  const enc = new TextEncoder();
  const buildRuns = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts
      .filter(Boolean)
      .map((part) => {
        const isBold = part.startsWith('**') && part.endsWith('**') && part.length > 4;
        const clean = (isBold ? part.slice(2, -2) : part).replace(/`/g, '');
        return `<w:r>${isBold ? '<w:rPr><w:b/></w:rPr>' : ''}<w:t xml:space="preserve">${escapeXml(clean)}</w:t></w:r>`;
      })
      .join('');
  };

  const pXml = (text: string, style: string, indent = 0, prefix = '') => {
    const ppr = `<w:pPr><w:pStyle w:val="${style}"/>${indent > 0 ? `<w:ind w:left="${indent}"/>` : ''}</w:pPr>`;
    return `<w:p>${ppr}${buildRuns(`${prefix}${text}`)}</w:p>`;
  };

  const lines = markdownText.split('\n');
  const paragraphs: string[] = [];
  if (!lines.some((l) => l.trim().startsWith('# ')) && title.trim()) {
    paragraphs.push(pXml(title.trim(), 'Heading1'));
  }

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('# ')) paragraphs.push(pXml(line.slice(2).trim(), 'Heading1'));
    else if (line.startsWith('## ')) paragraphs.push(pXml(line.slice(3).trim(), 'Heading2'));
    else if (line.startsWith('### ')) paragraphs.push(pXml(line.slice(4).trim(), 'Heading3'));
    else if (/^[-*]\s+/.test(line)) paragraphs.push(pXml(line.replace(/^[-*]\s+/, ''), 'Normal', 360, '• '));
    else if (/^\d+\.\s+/.test(line)) {
      const m = line.match(/^(\d+\.)\s+(.*)$/);
      if (m) paragraphs.push(pXml(m[2], 'Normal', 360, `${m[1]} `));
    } else {
      paragraphs.push(pXml(line, 'Normal'));
    }
  }

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-officedocument.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`;

  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  const docRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>
  <w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:rPr><w:b/><w:sz w:val="32"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:rPr><w:b/><w:color w:val="1D4ED8"/><w:sz w:val="26"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/><w:rPr><w:b/><w:sz w:val="23"/></w:rPr></w:style>
</w:styles>`;

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>${paragraphs.join('')}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr></w:body>
</w:document>`;

  return buildStoredZip([
    { name: '[Content_Types].xml', data: enc.encode(contentTypes) },
    { name: '_rels/.rels', data: enc.encode(rels) },
    { name: 'word/_rels/document.xml.rels', data: enc.encode(docRels) },
    { name: 'word/styles.xml', data: enc.encode(styles) },
    { name: 'word/document.xml', data: enc.encode(documentXml) },
  ]);
}

export async function exportDocAsDocx(
  filename: string,
  title: string,
  markdown: string,
  domain = 'devices'
): Promise<void> {
  const safeFilename = filename.toLowerCase().endsWith('.docx') ? filename : `${filename}.docx`;
  const backendBlob = await exportDocxFromBackend(title, markdown, domain, safeFilename);
  if (backendBlob && backendBlob.size > 0) {
    triggerBlobDownload(safeFilename, backendBlob);
    return;
  }
  const offlineBlob = buildOfflineDocxBlob(title, markdown);
  triggerBlobDownload(safeFilename, offlineBlob);
}

function markdownToPrintHtml(markdown: string): string {
  const renderInline = (line: string) =>
    escapeHtml(line).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  const lines = markdown.split('\n');
  const out: string[] = [];
  let listType: 'ul' | 'ol' | null = null;

  const closeList = () => {
    if (listType) {
      out.push(`</${listType}>`);
      listType = null;
    }
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      closeList();
      continue;
    }
    if (line.startsWith('### ')) {
      closeList();
      out.push(`<h3>${renderInline(line.slice(4))}</h3>`);
    } else if (line.startsWith('## ')) {
      closeList();
      out.push(`<h2>${renderInline(line.slice(3))}</h2>`);
    } else if (line.startsWith('# ')) {
      closeList();
      out.push(`<h1>${renderInline(line.slice(2))}</h1>`);
    } else if (/^[-*]\s+/.test(line)) {
      if (listType !== 'ul') {
        closeList();
        listType = 'ul';
        out.push('<ul>');
      }
      out.push(`<li>${renderInline(line.replace(/^[-*]\s+/, ''))}</li>`);
    } else if (/^\d+\.\s+/.test(line)) {
      if (listType !== 'ol') {
        closeList();
        listType = 'ol';
        out.push('<ol>');
      }
      out.push(`<li>${renderInline(line.replace(/^\d+\.\s+/, ''))}</li>`);
    } else {
      closeList();
      out.push(`<p>${renderInline(line)}</p>`);
    }
  }
  closeList();
  return out.join('\n');
}

export function exportDocAsPdf(title: string, markdown: string, metaLabel = '云脉·智慧医疗 转化医学工作站'): void {
  const bodyHtml = markdownToPrintHtml(markdown);
  const fullHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    @page { size: A4; margin: 20mm 18mm; }
    body {
      font-family: "PingFang SC", "Microsoft YaHei", "Segoe UI", sans-serif;
      color: #0f172a;
      line-height: 1.72;
      font-size: 13px;
      margin: 0;
    }
    .doc-meta {
      display: flex;
      justify-content: space-between;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 8px;
      margin-bottom: 18px;
      font-size: 11px;
      color: #64748b;
    }
    h1 { font-size: 20px; margin: 0 0 14px; color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
    h2 { font-size: 15px; margin: 18px 0 8px; color: #1d4ed8; }
    h3 { font-size: 13.5px; margin: 12px 0 6px; color: #0f172a; }
    p { margin: 0 0 8px; }
    ul, ol { margin: 0 0 10px; padding-left: 22px; }
    li { margin-bottom: 4px; }
    strong { color: #0f172a; }
  </style>
</head>
<body>
  <div class="doc-meta">
    <span>${escapeHtml(metaLabel)}</span>
    <span>导出时间：${new Date().toLocaleDateString('zh-CN')}</span>
  </div>
  ${bodyHtml}
</body>
</html>`;

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (doc && iframe.contentWindow) {
    doc.open();
    doc.write(fullHtml);
    doc.close();
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        if (iframe.parentNode) document.body.removeChild(iframe);
      }, 1500);
    }, 180);
    return;
  }

  const win = window.open('', '_blank', 'width=820,height=960');
  if (win) {
    win.document.write(fullHtml);
    win.document.close();
    win.focus();
    win.print();
  }
}

export function buildLocalParamCitations(
  state: AppParams,
  paperContent?: string
): Record<string, ParamCitation> {
  const domain = state.domain || 'devices';
  const kb = FRONTEND_KNOWLEDGE_BASE[domain] || [];
  const kbSource = kb[0]?.source || 'NMPA / FDA 临床转化基准';

  const domainFields: Record<string, Array<{ key: keyof AppParams; label: string; unit?: string; kws: string[] }>> = {
    devices: [
      { key: 'excitation_wavelength', label: '最佳激发波长', unit: 'nm', kws: ['激发', 'excitation', 'nm'] },
      { key: 'emission_wavelength', label: '最佳发射波长', unit: 'nm', kws: ['发射', 'emission', 'nm'] },
      { key: 'half_life', label: '半衰期 T₁/₂', unit: 'h', kws: ['半衰期', 'half-life'] },
      { key: 'metabolic_cycle', label: '完全代谢时间', unit: 'h', kws: ['代谢', '清除'] },
      { key: 'ld50', label: '半数致死量 LD₅₀', unit: 'mg/kg', kws: ['ld50'] },
      { key: 'mtd', label: '最大耐受剂量 MTD', unit: 'mg/kg', kws: ['mtd'] },
    ],
    drugs: [
      { key: 'target', label: '治疗靶点', kws: ['靶点', 'target', 'kras', 'egfr'] },
      { key: 'indication', label: '目标适应症', kws: ['适应症', '癌', 'tumor'] },
      { key: 'drug_half_life', label: '消除半衰期 T₁/₂', unit: 'h', kws: ['半衰期', 'half-life'] },
      { key: 'dlt_dose', label: '限制毒性剂量 DLT', unit: 'mg/m²', kws: ['dlt', '毒性剂量'] },
      { key: 'primary_endpoint', label: '主要有效终点', kws: ['终点', 'orr', 'pfs'] },
      { key: 'sample_size', label: '首期受试者规模', unit: '例', kws: ['样本', '受试者', '例'] },
    ],
    ai: [
      { key: 'architecture', label: '算法神经网络架构', kws: ['架构', 'unet', 'transformer'] },
      { key: 'modality', label: '医学影像模态', kws: ['模态', 'mri', 'ct'] },
      { key: 'accuracy', label: '诊断准确度 (AUC)', unit: '%', kws: ['auc', '准确', '精度'] },
      { key: 'latency', label: '边缘推理延迟', unit: 'ms', kws: ['延迟', '时延', 'ms'] },
      { key: 'integration_standard', label: '网络接入标准', kws: ['dicom', 'hl7', 'pacs'] },
      { key: 'sample_size', label: '测试回顾队列基数', unit: '×10例', kws: ['样本', '队列'] },
    ],
    surgical: [
      { key: 'anatomical_site', label: '目标解剖部位', kws: ['胰', '肝', '解剖'] },
      { key: 'core_instruments', label: '核心手术器械配置', kws: ['器械', '腹腔镜', '吻合器'] },
      { key: 'learning_curve_cases', label: '带教学习曲线', unit: '例', kws: ['学习曲线', '例'] },
      { key: 'safety_endpoint', label: '临床安全随访终点', kws: ['并发症', '安全'] },
      { key: 'phase_1_duration', label: '培训示范周期', unit: '个月', kws: ['周期', '月'] },
      { key: 'sample_size', label: '临床准入病例数', unit: '例', kws: ['样本', '病例'] },
    ],
  };

  const segments = (paperContent || '')
    .split(/(?<=[。！？.!?\n])\s*|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const out: Record<string, ParamCitation> = {};
  const specs = domainFields[domain] || domainFields.devices;

  for (const spec of specs) {
    const valStr = String(state[spec.key] ?? '');
    const hit = segments.find((seg) => {
      const lower = seg.toLowerCase();
      return lower.includes(valStr.toLowerCase()) && spec.kws.some((kw) => lower.includes(kw));
    });

    if (hit) {
      out[spec.key] = {
        page: 1,
        quote: hit.slice(0, 180),
        source: 'pdf_grounding',
      };
    } else {
      out[spec.key] = {
        page: 1,
        quote: `基于文献《${state.paper_title}》与 ${kbSource} 校准：${spec.label} = ${valStr}${spec.unit ? ` ${spec.unit}` : ''}`,
        source: 'rag_calibrated',
      };
    }
  }

  return out;
}
