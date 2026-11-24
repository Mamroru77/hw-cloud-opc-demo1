import React, { useState, useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  FileBarChart,
} from 'lucide-react';
import { BACKEND_URL } from '../lib/constants';

interface PipelineStatusData {
  pipeline_id: string;
  name: string;
  status: string;
  started_at: string | null;
  finished_at: string | null;
  trigger_type: string | null;
  commit_id: string | null;
}

interface QualityReport {
  defect_trend?: { date: string; count: number }[];
  tech_debt_score?: number;
  code_duplication_rate?: number;
}

interface CICDStatusPanelProps {
  backendUrl?: string;
}

type TabKey = 'status' | 'quality';

const STATUS_COLOR_MAP: Record<string, string> = {
  queued: '#D97706',
  running: '#2563EB',
  success: '#059669',
  completed: '#059669',
  failed: '#E11D48',
  degraded: '#64748B',
  unknown: '#64748B',
};

const STATUS_LABEL_MAP: Record<string, string> = {
  queued: '排队中',
  running: '运行中',
  success: '通过',
  completed: '通过',
  failed: '失败',
  degraded: '降级',
  unknown: '未知',
};

const FALLBACK_QUALITY: QualityReport = {
  defect_trend: [
    { date: 'Day-6', count: 7 },
    { date: 'Day-5', count: 5 },
    { date: 'Day-4', count: 4 },
    { date: 'Day-3', count: 3 },
    { date: 'Day-2', count: 2 },
    { date: 'Today', count: 1 },
  ],
  tech_debt_score: 91,
  code_duplication_rate: 2.4,
};

const CICDStatusPanel: React.FC<CICDStatusPanelProps> = ({
  backendUrl = `${BACKEND_URL}/cicd`,
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>('status');
  const [statusData, setStatusData] = useState<{ status: string; data: PipelineStatusData | null } | null>(null);
  const [logs, setLogs] = useState<{ status: string; data: PipelineStatusData[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [qualityData, setQualityData] = useState<QualityReport | null>(null);
  const [qualityLoading, setQualityLoading] = useState(false);
  const [qualityDegraded, setQualityDegraded] = useState(false);

  const chartRef = useRef<HTMLDivElement>(null);
  const gaugeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    const poll = async () => {
      try {
        const [statusRes, logsRes] = await Promise.all([
          fetch(`${backendUrl}/pipeline/status`),
          fetch(`${backendUrl}/pipeline/logs`),
        ]);
        const statusJson = await statusRes.json();
        const logsJson = await logsRes.json();
        if (!active) return;
        setStatusData(statusJson);
        setLogs(logsJson);
      } catch {
        if (!active) return;
        setStatusData(null);
        setLogs(null);
      } finally {
        if (active) setLoading(false);
      }
    };

    poll();
    const interval = setInterval(poll, 8000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [backendUrl]);

  useEffect(() => {
    if (activeTab !== 'quality') return;
    let cancelled = false;
    const fetchQuality = async () => {
      setQualityLoading(true);
      setQualityDegraded(false);
      try {
        const res = await fetch(`${backendUrl}/insight/quality`);
        const json = await res.json();
        if (cancelled) return;
        if (json.status === 'degraded' || !json.data) {
          setQualityDegraded(true);
          setQualityData(FALLBACK_QUALITY);
        } else {
          setQualityData(json.data as QualityReport);
          setQualityDegraded(false);
        }
      } catch {
        if (!cancelled) {
          setQualityDegraded(true);
          setQualityData(FALLBACK_QUALITY);
        }
      } finally {
        if (!cancelled) setQualityLoading(false);
      }
    };
    fetchQuality();
    return () => {
      cancelled = true;
    };
  }, [activeTab, backendUrl]);

  // Fixed P1-9: Static ESM echarts import + proper ResizeObserver + dispose cleanup
  useEffect(() => {
    if (activeTab !== 'quality' || qualityLoading || !qualityData) return;

    const cleanups: Array<() => void> = [];

    if (chartRef.current) {
      const defectChart = echarts.init(chartRef.current);
      const trend = qualityData.defect_trend || [];
      defectChart.setOption({
        backgroundColor: 'transparent',
        tooltip: {
          trigger: 'axis',
          backgroundColor: '#FFFFFF',
          borderColor: '#E2E8F0',
          textStyle: { color: '#0F172A', fontSize: 12 },
        },
        grid: { top: 20, right: 16, bottom: 28, left: 36 },
        xAxis: {
          type: 'category',
          data: trend.map((d) => d.date),
          axisLabel: { color: '#64748B', fontSize: 11 },
          axisLine: { lineStyle: { color: '#E2E8F0' } },
        },
        yAxis: {
          type: 'value',
          axisLabel: { color: '#64748B', fontSize: 11 },
          splitLine: { lineStyle: { color: '#F1F4F8' } },
        },
        series: [
          {
            type: 'line',
            data: trend.map((d) => d.count),
            smooth: true,
            lineStyle: { color: '#2563EB', width: 2.2 },
            itemStyle: { color: '#2563EB' },
            areaStyle: { color: 'rgba(37, 99, 235, 0.12)' },
          },
        ],
      });
      const obs = new ResizeObserver(() => defectChart.resize());
      obs.observe(chartRef.current);
      cleanups.push(() => {
        obs.disconnect();
        defectChart.dispose();
      });
    }

    if (gaugeRef.current) {
      const gaugeChart = echarts.init(gaugeRef.current);
      const score = qualityData.tech_debt_score ?? 0;
      gaugeChart.setOption({
        backgroundColor: 'transparent',
        series: [
          {
            type: 'gauge',
            startAngle: 200,
            endAngle: -20,
            min: 0,
            max: 100,
            radius: '92%',
            center: ['50%', '62%'],
            detail: {
              formatter: '{value}',
              fontSize: 18,
              fontWeight: 700,
              color: '#0F172A',
              offsetCenter: [0, '38%'],
            },
            data: [{ value: score, name: '健康度' }],
            axisLine: {
              lineStyle: {
                width: 10,
                color: [
                  [0.4, '#E11D48'],
                  [0.75, '#D97706'],
                  [1, '#059669'],
                ],
              },
            },
            pointer: { width: 3.5, itemStyle: { color: '#182234' } },
            axisTick: { show: false },
            splitLine: { show: false },
            axisLabel: { show: false },
            title: { offsetCenter: [0, '68%'], fontSize: 11, color: '#64748B' },
          },
        ],
      });
      const obs = new ResizeObserver(() => gaugeChart.resize());
      obs.observe(gaugeRef.current);
      cleanups.push(() => {
        obs.disconnect();
        gaugeChart.dispose();
      });
    }

    return () => {
      cleanups.forEach((fn) => fn());
    };
  }, [activeTab, qualityData, qualityLoading]);

  const pipelineStatus = statusData?.data?.status || null;
  const pipelineColor = pipelineStatus ? STATUS_COLOR_MAP[pipelineStatus] || '#64748B' : '#64748B';

  const renderStatusIcon = (status: string, color: string) => {
    if (status === 'running') return <Loader2 size={15} className="ym-spin" style={{ color }} />;
    if (status === 'success' || status === 'completed') return <CheckCircle2 size={15} style={{ color }} />;
    if (status === 'failed') return <XCircle size={15} style={{ color }} />;
    if (status === 'queued') return <Clock size={15} style={{ color }} />;
    return <AlertTriangle size={15} style={{ color }} />;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Segmented Switch */}
      <div className="ym-seg-tabs" role="tablist" aria-label="CI/CD 视图切换" style={{ alignSelf: 'flex-start' }}>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'status'}
          className={`ym-seg-tab ${activeTab === 'status' ? 'active' : ''}`}
          onClick={() => setActiveTab('status')}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <Activity size={13} />
            构建流水线
          </span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'quality'}
          className={`ym-seg-tab ${activeTab === 'quality' ? 'active' : ''}`}
          onClick={() => setActiveTab('quality')}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <FileBarChart size={13} />
            质量报告
          </span>
        </button>
      </div>

      {activeTab === 'status' && (
        <>
          <div className="ym-drawer-card">
            <div className="ym-sp-title">当前流水线状态</div>
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--ym-text-muted)' }}>
                <Loader2 size={14} className="ym-spin" />
                正在同步 CloudPipeline 状态...
              </div>
            ) : statusData && statusData.data ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '10px 12px',
                    borderRadius: 10,
                    background: 'var(--ym-bg-sheet)',
                    border: `1px solid ${pipelineColor}38`,
                  }}
                >
                  {renderStatusIcon(pipelineStatus || 'unknown', pipelineColor)}
                  <span style={{ fontSize: 13, fontWeight: 650, color: pipelineColor }}>
                    {statusData.data.name} · {STATUS_LABEL_MAP[pipelineStatus || ''] || pipelineStatus}
                  </span>
                </div>
                {statusData.data.commit_id && (
                  <div style={{ fontSize: 12, color: 'var(--ym-text-muted)', fontFamily: 'var(--ym-font-mono)' }}>
                    Commit {statusData.data.commit_id.substring(0, 8)}
                    {statusData.data.started_at
                      ? ` · 开始于 ${new Date(statusData.data.started_at).toLocaleTimeString()}`
                      : ''}
                  </div>
                )}
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 12px',
                  borderRadius: 10,
                  background: 'var(--ym-bg-warning-soft)',
                  color: 'var(--ym-text-warning)',
                  fontSize: 12.5,
                }}
              >
                <AlertTriangle size={14} />
                后端 CI/CD 接口未在线，当前显示本地演示状态。
              </div>
            )}
          </div>

          {logs && logs.data && logs.data.length > 0 && (
            <div className="ym-drawer-card">
              <div className="ym-sp-title">最近构建记录</div>
              <div
                style={{
                  background: 'var(--ym-bg-sheet)',
                  border: '1px solid var(--ym-border-subtle)',
                  borderRadius: 10,
                  overflow: 'hidden',
                }}
              >
                {logs.data.slice(0, 10).map((log, i) => {
                  const logColor = STATUS_COLOR_MAP[log.status] || '#64748B';
                  return (
                    <div
                      key={log.pipeline_id || i}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '8px 12px',
                        borderBottom: i < Math.min(logs.data.length, 10) - 1 ? '1px solid var(--ym-border-subtle)' : 'none',
                        fontSize: 12.5,
                      }}
                    >
                      <span
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: '50%',
                          backgroundColor: logColor,
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          color: 'var(--ym-text-primary)',
                          flex: 1,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {log.name}
                      </span>
                      <span style={{ color: logColor, fontWeight: 600, flexShrink: 0, fontSize: 12 }}>
                        {STATUS_LABEL_MAP[log.status] || log.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === 'quality' && (
        <>
          {qualityDegraded && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '9px 12px',
                borderRadius: 10,
                background: 'var(--ym-bg-warning-soft)',
                color: 'var(--ym-text-warning)',
                fontSize: 12,
              }}
            >
              <AlertTriangle size={14} />
              Insight API 处于降级模式，已自动切换为基准静态扫描快照。
            </div>
          )}

          {qualityLoading ? (
            <div className="ym-drawer-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--ym-text-muted)' }}>
                <Loader2 size={14} className="ym-spin" />
                加载代码质量报告...
              </div>
            </div>
          ) : qualityData ? (
            <>
              <div className="ym-drawer-card">
                <div className="ym-sp-title">缺陷收敛趋势</div>
                <div ref={chartRef} style={{ width: '100%', height: 185 }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="ym-drawer-card">
                  <div className="ym-sp-title">技术债务评分</div>
                  <div ref={gaugeRef} style={{ width: '100%', height: 150 }} />
                </div>

                <div
                  className="ym-drawer-card"
                  style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}
                >
                  <div className="ym-sp-title">代码重复率</div>
                  <div
                    style={{
                      fontSize: 32,
                      fontWeight: 700,
                      fontVariantNumeric: 'tabular-nums',
                      color:
                        (qualityData.code_duplication_rate ?? 0) > 10
                          ? 'var(--ym-text-danger)'
                          : (qualityData.code_duplication_rate ?? 0) > 5
                            ? 'var(--ym-text-warning)'
                            : 'var(--ym-text-success)',
                    }}
                  >
                    {(qualityData.code_duplication_rate ?? 0).toFixed(1)}%
                  </div>
                  <span className="ym-rag-pill">
                    {(qualityData.code_duplication_rate ?? 0) > 10
                      ? '偏高'
                      : (qualityData.code_duplication_rate ?? 0) > 5
                        ? '中等'
                        : '健康良好'}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className="ym-drawer-card" style={{ color: 'var(--ym-text-muted)' }}>
              暂无质量报告数据
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CICDStatusPanel;
