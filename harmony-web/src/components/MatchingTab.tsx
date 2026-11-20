import React, { useMemo } from 'react';
import { CustomEChart } from './CustomEChart';
import { buildRadarChartOption } from '../utils/chartOptions';
import type { AppParams, RAGReference, RobotMatch } from '../lib/types';

interface MatchingTabProps {
  state: AppParams;
  matchedRobots: RobotMatch[];
  ragReferences: RAGReference[];
}

export const MatchingTab: React.FC<MatchingTabProps> = ({
  state,
  matchedRobots,
  ragReferences,
}) => {
  const domain = state.domain || 'devices';
  const radarOption = useMemo(
    () => buildRadarChartOption(matchedRobots, domain),
    [matchedRobots, domain]
  );

  const heading =
    domain === 'drugs'
      ? '推荐合作临床 GCP 基地与 CDMO 机构 (TOP 3)'
      : domain === 'ai'
        ? '推荐对接医院 PACS 影像系统与算力集群 (TOP 3)'
        : domain === 'surgical'
          ? '推荐对接层流手术室与技能实训基地 (TOP 3)'
          : '推荐适配手术系统与机器人 (TOP 3)';

  return (
    <div>
      <div className="ym-matching-grid">
        <section className="ym-col-section">
          <div className="ym-title-row">
            <h1 className="ym-h1">{heading}</h1>
            <span className="ym-rag-pill">
              <span className="ym-status-dot ok" />
              目标科室：{state.target_department}
            </span>
          </div>
          <p className="ym-lead">
            基于当前论文理化指标与临床准入约束，场景匹配 Agent 从装机覆盖、通道兼容与一期试验便利度完成综合排序。
          </p>

          <div className="ym-match-list">
            {matchedRobots.map((robot, idx) => (
              <article key={robot.id} className={`ym-match-card ${idx === 0 ? 'top1' : ''}`}>
                <div className="ym-match-head">
                  <div>
                    <div className="ym-match-name">
                      <span className="ym-match-rank">TOP {idx + 1}</span>
                      {robot.name}
                    </div>
                    <div className="ym-match-maker">
                      {robot.manufacturer} · 全国装机/合作基地 {robot.national_installs} 家
                    </div>
                  </div>
                  <div className="ym-score-badge" title="综合匹配度评分">
                    {robot.compatibility_score}
                    <span style={{ fontSize: 11, fontWeight: 500 }}>%</span>
                  </div>
                </div>

                <p className="ym-match-desc">{robot.description}</p>

                <div className="ym-match-tags">
                  {robot.channels.map((ch) => (
                    <span key={ch} className="ym-tag-chip">
                      {ch}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="ym-radar-panel">
          <div className="ym-sub-head" style={{ marginBottom: 4 }}>
            <h2 className="ym-h2">五维适配度雷达比对</h2>
            <span className="ym-hint">实时联动参数权重</span>
          </div>
          <div style={{ width: '100%', height: 340 }}>
            <CustomEChart option={radarOption} style={{ width: '100%', height: '100%' }} />
          </div>
        </section>
      </div>

      {ragReferences.length > 0 && (
        <section className="ym-rag-section" aria-label="RAG 法规比对依据">
          <div className="ym-rag-head">
            <span className="ym-rag-pill">
              <span className="ym-status-dot ok" />
              场景准入法规依据
            </span>
            <span className="ym-hint">共 {ragReferences.length} 条核验记录</span>
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
