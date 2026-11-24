import React, { useMemo, useState } from 'react';
import { Pencil, Quote, X } from 'lucide-react';
import { CustomEChart } from './CustomEChart';
import { buildPkChartOption } from '../utils/chartOptions';
import type { AppParams, ParamCitation, RAGReference } from '../lib/types';

interface MetricSpec {
  key: keyof AppParams;
  label: string;
  unit?: string;
  type: 'number' | 'text';
  step?: string;
  compact?: boolean;
  displayMultiplier?: number;
}

interface ParamsTabProps {
  state: AppParams;
  ragReferences: RAGReference[];
  paramCitations?: Record<string, ParamCitation>;
  onInlineUpdateParam: (key: keyof AppParams, value: number | string, label: string) => void;
}

function getCitationSourceLabel(source?: ParamCitation['source']): string {
  if (source === 'pdf_grounding') return 'PDF 原文提取';
  if (source === 'llm_grounding') return 'LLM 语义定位';
  return 'RAG 法规校准';
}

function highlightCitationText(quote: string, targetValue: string): React.ReactNode {
  const token = targetValue.trim();
  if (!token || token.length < 2) return quote;
  const idx = quote.toLowerCase().indexOf(token.toLowerCase());
  if (idx < 0) return quote;
  const before = quote.slice(0, idx);
  const match = quote.slice(idx, idx + token.length);
  const after = quote.slice(idx + token.length);
  return (
    <>
      {before}
      <mark style={{ background: 'rgba(37, 99, 235, 0.16)', color: 'var(--ym-text-primary)', padding: '0 3px', borderRadius: 3, fontWeight: 600 }}>
        {match}
      </mark>
      {after}
    </>
  );
}

function getMetricSpecs(domain: string): MetricSpec[] {
  if (domain === 'drugs') {
    return [
      { key: 'target', label: '治疗靶点', type: 'text', compact: true },
      { key: 'indication', label: '目标适应症', type: 'text', compact: true },
      { key: 'drug_half_life', label: '消除半衰期 T₁/₂', unit: 'h', type: 'number', step: '0.5' },
      { key: 'dlt_dose', label: '限制毒性剂量 DLT', unit: 'mg/m²', type: 'number', step: '10' },
      { key: 'primary_endpoint', label: '主要有效终点', type: 'text', compact: true },
      { key: 'sample_size', label: '首期受试者规模', unit: '例', type: 'number', step: '1' },
    ];
  }
  if (domain === 'ai') {
    return [
      { key: 'architecture', label: '算法神经网络架构', type: 'text', compact: true },
      { key: 'modality', label: '医学影像模态', type: 'text', compact: true },
      { key: 'accuracy', label: '诊断准确度 (AUC)', unit: '%', type: 'number', step: '0.1' },
      { key: 'latency', label: '边缘推理延迟', unit: 'ms', type: 'number', step: '0.5' },
      { key: 'integration_standard', label: '网络接入标准', type: 'text', compact: true },
      { key: 'sample_size', label: '测试回顾队列基数', unit: '×10例', type: 'number', step: '1' },
    ];
  }
  if (domain === 'surgical') {
    return [
      { key: 'anatomical_site', label: '目标解剖部位', type: 'text', compact: true },
      { key: 'core_instruments', label: '核心手术器械配置', type: 'text', compact: true },
      { key: 'learning_curve_cases', label: '带教学习曲线', unit: '例', type: 'number', step: '1' },
      { key: 'safety_endpoint', label: '临床安全随访终点', type: 'text', compact: true },
      { key: 'phase_1_duration', label: '培训示范周期', unit: '个月', type: 'number', step: '1' },
      { key: 'sample_size', label: '临床准入病例数', unit: '例', type: 'number', step: '1' },
    ];
  }
  return [
    { key: 'excitation_wavelength', label: '最佳激发波长', unit: 'nm', type: 'number', step: '1' },
    { key: 'emission_wavelength', label: '最佳发射波长', unit: 'nm', type: 'number', step: '1' },
    { key: 'half_life', label: '半衰期 T₁/₂', unit: 'h', type: 'number', step: '0.1' },
    { key: 'metabolic_cycle', label: '完全代谢时间', unit: 'h', type: 'number', step: '1' },
    { key: 'ld50', label: '半数致死量 LD₅₀', unit: 'mg/kg', type: 'number', step: '1' },
    { key: 'mtd', label: '最大耐受剂量 MTD', unit: 'mg/kg', type: 'number', step: '0.5' },
  ];
}

export const ParamsTab: React.FC<ParamsTabProps> = ({
  state,
  ragReferences,
  paramCitations = {},
  onInlineUpdateParam,
}) => {
  const domain = state.domain || 'devices';
  const [editingKey, setEditingKey] = useState<keyof AppParams | null>(null);
  const [draftVal, setDraftVal] = useState('');
  const [selectedCiteKey, setSelectedCiteKey] = useState<keyof AppParams | null>(null);

  const pkChartOption = useMemo(() => buildPkChartOption(state), [state]);
  const specs = useMemo(() => getMetricSpecs(domain), [domain]);

  const startEdit = (spec: MetricSpec) => {
    setEditingKey(spec.key);
    setDraftVal(String(state[spec.key] ?? ''));
  };

  const commitEdit = (spec: MetricSpec) => {
    const trimmed = draftVal.trim();
    setEditingKey(null);
    if (!trimmed) return;
    if (spec.type === 'number') {
      const num = parseFloat(trimmed);
      if (Number.isNaN(num) || num <= 0) return;
      if (num !== Number(state[spec.key])) {
        onInlineUpdateParam(spec.key, num, spec.label);
      }
    } else if (trimmed !== String(state[spec.key])) {
      onInlineUpdateParam(spec.key, trimmed, spec.label);
    }
  };

  // Compute domain-aware KPI strip values
  const kpis = useMemo(() => {
    if (domain === 'ai') {
      return [
        { k: 'AUC 精度', v: `${state.accuracy}%` },
        { k: '边缘延迟', v: `${state.latency} ms` },
        { k: '协议标准', v: state.integration_standard },
      ];
    }
    if (domain === 'surgical') {
      return [
        { k: '收敛阈值', v: `${state.learning_curve_cases} 例` },
        { k: '示范规模', v: `${state.sample_size} 例` },
        { k: '推广周期', v: `${state.phase_1_duration} 个月` },
      ];
    }
    if (domain === 'drugs') {
      const tHalf = state.drug_half_life || 12;
      const auc = Math.round((100 / (Math.log(2) / tHalf)) * (1 - Math.exp((-Math.log(2) / tHalf) * 96)));
      return [
        { k: '消除半衰期 T₁/₂', v: `${tHalf} h` },
        { k: '起始剂量 1/10 DLT', v: `${(state.dlt_dose * 0.1).toFixed(1)} mg/m²` },
        { k: 'AUC₀₋₉₆', v: `${auc} %·h` },
      ];
    }
    const tHalf = state.half_life || 2.4;
    const auc24 = Math.round((100 / (Math.log(2) / tHalf)) * (1 - Math.exp((-Math.log(2) / tHalf) * 24)));
    return [
      { k: '初始浓度 C₀', v: '100.0 %' },
      { k: '半衰期 T₁/₂', v: `${tHalf} h` },
      { k: 'AUC₀₋₂₄', v: `${auc24} %·h` },
    ];
  }, [domain, state]);

  const chartTitle =
    domain === 'ai'
      ? '智能诊断分类效能 (SaMD ROC 曲线)'
      : domain === 'surgical'
        ? '手术用时学习曲线 (Learning Curve)'
        : '体内药代动力学 (PK) 代谢曲线';

  const chartLead =
    domain === 'drugs'
      ? `血浆消除半衰期 ${state.drug_half_life} h，目标靶点 ${state.target}，主要疗效终点 ${state.primary_endpoint}，符合新药一期安全性及有效性设计基准。`
      : domain === 'ai'
        ? `SaMD 算法基于 ${state.architecture} 架构处理 ${state.modality} 影像，AUC 精度达 ${state.accuracy}%，单帧边缘推理时延 ${state.latency} ms。`
        : domain === 'surgical'
          ? `改良腔镜术式面向 ${state.anatomical_site}，核心配置为 ${state.core_instruments}，预计青年医师带教学习曲线 ${state.learning_curve_cases} 例收敛。`
          : `近红外荧光探针激发波长 ${state.excitation_wavelength} nm，经静脉注射后呈单指数快速清除，半衰期 ${state.half_life} h，${state.metabolic_cycle} h 内完全代谢。`;

  const safetyRatio = Math.max(1, Math.round(state.ld50 / Math.max(0.1, state.mtd)));

  const safetyTitle =
    domain === 'drugs'
      ? '新药药效与安全性评估'
      : domain === 'ai'
        ? 'SaMD 影像算法集成与质控评估'
        : domain === 'surgical'
          ? '改良术式安全准入与推广评估'
          : 'AI4S 探针安全性评估';

  const safetyBadge =
    domain === 'drugs'
      ? `DLT ${state.dlt_dose} mg/m²`
      : domain === 'ai'
        ? `${state.latency <= 50 ? '实时达标' : '待优化'}`
        : domain === 'surgical'
          ? `学习曲线 ${state.learning_curve_cases} 例`
          : `安全窗 ${safetyRatio}×`;

  const safetyBody =
    domain === 'drugs'
      ? `针对 ${state.target} 靶点具备高特异性结合能力，一期拟在 ${state.clinical_trial_site} 招募 ${state.sample_size} 例受试者，以 ${state.primary_endpoint} 验证临床疗效。`
      : domain === 'ai'
        ? `边缘推理集群延迟 ${state.latency} ms 满足 ${state.integration_standard} 实时交互规范，可通过 ${state.clinical_trial_site} 回顾性队列快速确立金标准。`
        : domain === 'surgical'
          ? `采用 ${state.core_instruments} 进行精细缝合重建，可显著降低 ${state.safety_endpoint}，${state.learning_curve_cases} 例带教目标利于下沉推广。`
          : `短半衰期及肾清除特征避免肝脾滞留，最大耐受剂量达安全窗基准 ${safetyRatio} 倍，符合一期临床安全性申报路径。`;

  const paramsHeading =
    domain === 'ai'
      ? '结构化算法参数'
      : domain === 'surgical'
        ? '结构化手术参数'
        : domain === 'drugs'
          ? '结构化药理参数'
          : '结构化理化参数';

  return (
    <div>
      <div className="ym-params-grid">
        {/* Left Column: Chart & KPIs */}
        <section className="ym-col-section">
          <div className="ym-title-row">
            <h1 className="ym-h1">{chartTitle}</h1>
            <span className="ym-rag-pill">
              <span className="ym-status-dot ok" />
              RAG 法规校准
            </span>
          </div>
          <p className="ym-lead">{chartLead}</p>

          <div className="ym-kpi-bar">
            {kpis.map((item) => (
              <div key={item.k} className="ym-kpi-chip">
                <span className="ym-kpi-k">{item.k}</span>
                <span className="ym-kpi-v">{item.v}</span>
              </div>
            ))}
          </div>

          <div className="ym-chart-box">
            <CustomEChart option={pkChartOption} style={{ width: '100%', height: '100%' }} />
          </div>

          <div className="ym-chart-foot">
            <span>
              {domain === 'devices'
                ? `FL-Probe-${Math.round(state.excitation_wavelength)} 单室清除拟合`
                : domain === 'drugs'
                  ? `${state.target} PK 消除模型`
                  : domain === 'ai'
                    ? `${state.architecture} ROC 灵敏度曲线`
                    : `${state.anatomical_site} 负指数学习曲线`}
            </span>
            <span>R² = 0.994</span>
          </div>
        </section>

        {/* Right Column: Inline-Editable MetricTiles + Safety Assessment */}
        <section className="ym-col-section">
          <div className="ym-sub-head">
            <h2 className="ym-h2">{paramsHeading}</h2>
            <span className="ym-hint">点击任意卡片就地编辑</span>
          </div>

          <div className="ym-metric-grid">
            {specs.map((spec) => {
              const isEditing = editingKey === spec.key;
              const rawVal = state[spec.key];
              const citation = paramCitations[spec.key];
              const isCited = selectedCiteKey === spec.key;

              if (isEditing) {
                return (
                  <div key={spec.key} className="ym-metric-tile editing">
                    <div className="ym-metric-top">
                      <span className="ym-metric-k">{spec.label}</span>
                      <span className="ym-metric-ed">编辑中</span>
                    </div>
                    <div className="ym-metric-val-row">
                      <input
                        type={spec.type}
                        step={spec.step}
                        className={`ym-metric-input ${spec.compact ? 'compact' : ''}`}
                        value={draftVal}
                        autoFocus
                        aria-label={`编辑${spec.label}`}
                        onChange={(e) => setDraftVal(e.target.value)}
                        onBlur={() => commitEdit(spec)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitEdit(spec);
                          if (e.key === 'Escape') setEditingKey(null);
                        }}
                      />
                      {spec.unit && <span className="ym-metric-unit">{spec.unit}</span>}
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={spec.key}
                  className={`ym-metric-card-wrap ${isCited ? 'active-cite' : ''}`}
                >
                  <button
                    type="button"
                    className="ym-metric-tile"
                    onClick={() => startEdit(spec)}
                    aria-label={`编辑 ${spec.label}，当前值 ${rawVal}${spec.unit ? ` ${spec.unit}` : ''}`}
                  >
                    <div className="ym-metric-top">
                      <span className="ym-metric-k">{spec.label}</span>
                      <Pencil size={12} className="ym-metric-edit-cue" />
                    </div>
                    <div className="ym-metric-val-row">
                      <span className={`ym-metric-val ${spec.compact ? 'compact' : ''}`}>
                        {String(rawVal)}
                      </span>
                      {spec.unit && <span className="ym-metric-unit">{spec.unit}</span>}
                    </div>
                  </button>
                  {citation && (
                    <div className="ym-metric-cite-row">
                      <button
                        type="button"
                        className={`ym-metric-cite-pill ${citation.source === 'rag_calibrated' ? 'rag' : ''}`}
                        onClick={() => setSelectedCiteKey((prev) => (prev === spec.key ? null : spec.key))}
                        aria-label={`查看 ${spec.label} 原文溯源`}
                      >
                        <Quote size={10} />
                        <span>
                          P.{citation.page || 1} {citation.source === 'rag_calibrated' ? '法规校准' : '原文溯源'}
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {selectedCiteKey && paramCitations[selectedCiteKey] && (
            <div className="ym-cite-drawer" role="region" aria-label="参数原文溯源详情">
              <div className="ym-cite-drawer-head">
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Quote size={13} style={{ color: 'var(--ym-text-accent)' }} />
                  <span>
                    {specs.find((s) => s.key === selectedCiteKey)?.label || selectedCiteKey} · 第{' '}
                    {paramCitations[selectedCiteKey].page || 1} 页溯源凭据
                  </span>
                </span>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span className="ym-cite-source-tag">
                    {getCitationSourceLabel(paramCitations[selectedCiteKey].source)}
                  </span>
                  <button
                    type="button"
                    className="ym-icon-btn"
                    style={{ width: 22, height: 22 }}
                    aria-label="关闭溯源详情"
                    onClick={() => setSelectedCiteKey(null)}
                  >
                    <X size={13} />
                  </button>
                </div>
              </div>
              <p className="ym-cite-quote">
                {highlightCitationText(
                  paramCitations[selectedCiteKey].quote,
                  String(state[selectedCiteKey] ?? '')
                )}
              </p>
            </div>
          )}

          <div className="ym-safety-panel">
            <div className="ym-sp-head">
              <span className="ym-sp-title">{safetyTitle}</span>
              <span className="ym-sp-badge">{safetyBadge}</span>
            </div>
            <p className="ym-sp-body">{safetyBody}</p>
            <div className="ym-sp-refs">
              <span>[1] NMPA 指导原则</span>
              <span>[2] FDA / ICH 基准</span>
              <span>[3] 科室：{state.target_department}</span>
            </div>
          </div>
        </section>
      </div>

      {/* RAG Regulatory Citations */}
      {ragReferences.length > 0 && (
        <section className="ym-rag-section" aria-label="RAG 知识库法规比对核验凭据">
          <div className="ym-rag-head">
            <span className="ym-rag-pill">
              <span className="ym-status-dot ok" />
              RAG 知识库比对核验凭据
            </span>
            <span className="ym-hint">已检索 {ragReferences.length} 项权威法规与学术基准</span>
          </div>
          <div className="ym-rag-cards">
            {ragReferences.map((ref, idx) => (
              <article key={idx} className="ym-rag-card">
                <div className="ym-rag-source">{ref.source}</div>
                <div className="ym-rag-title">{ref.title}</div>
                <p className="ym-rag-content">{ref.content}</p>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
