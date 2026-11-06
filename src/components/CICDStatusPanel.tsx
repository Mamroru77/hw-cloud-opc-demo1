import React, { useState, useEffect, useRef } from 'react';
import { Activity, AlertTriangle, CheckCircle2, Clock, XCircle, Loader2, FileBarChart } from 'lucide-react';

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

const CICDStatusPanel: React.FC<CICDStatusPanelProps> = ({ backendUrl = 'http://127.0.0.1:8000/api/cicd' }) => {
  const [activeTab, setActiveTab] = useState<TabKey>('status');
  const [statusData, setStatusData] = useState<{ status: string; data: PipelineStatusData | null } | null>(null);
  const [logs, setLogs] = useState<{ status: string; data: PipelineStatusData[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [qualityData, setQualityData] = useState<QualityReport | null>(null);
  const [qualityLoading, setQualityLoading] = useState(false);
  const [qualityDegraded, setQualityDegraded] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);
  const gaugeRef = useRef<HTMLDivElement>(null);

  const statusColorMap: Record<string, string> = {
    queued: '#f59e0b',
    running: '#3b82f6',
    success: '#10b981',
    completed: '#10b981',
    failed: '#ef4444',
    degraded: '#6b7280',
    unknown: '#6b7280',
  };

  const statusLabelMap: Record<string, string> = {
    queued: '排队中',
    running: '运行中',
    success: '成功',
    completed: '成功',
    failed: '失败',
    degraded: '降级',
    unknown: '未知',
  };

  const StatusIcon: React.FC<{ status: string; color: string }> = ({ status, color }) => {
    if (status === 'running') return <Loader2 size={14} style={{ color, animation: 'spin 1s linear infinite' }} />;
    if (status === 'success' || status === 'completed') return <CheckCircle2 size={14} style={{ color }} />;
    if (status === 'failed') return <XCircle size={14} style={{ color }} />;
    if (status === 'queued') return <Clock size={14} style={{ color }} />;
    return <AlertTriangle size={14} style={{ color }} />;
  };

  useEffect(() => {
    const poll = async () => {
      try {
        const [statusRes, logsRes] = await Promise.all([
          fetch(`${backendUrl}/pipeline/status`),
          fetch(`${backendUrl}/pipeline/logs`),
        ]);
        const statusJson = await statusRes.json();
        const logsJson = await logsRes.json();
        setStatusData(statusJson);
        setLogs(logsJson);
      } catch {
        setStatusData(null);
        setLogs(null);
      } finally {
        setLoading(false);
      }
    };

    poll();
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
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
          setQualityData(null);
        } else {
          setQualityData(json.data as QualityReport);
          setQualityDegraded(false);
        }
      } catch {
        if (!cancelled) {
          setQualityDegraded(true);
          setQualityData(null);
        }
      } finally {
        if (!cancelled) setQualityLoading(false);
      }
    };
    fetchQuality();
    return () => { cancelled = true; };
  }, [activeTab, backendUrl]);

  useEffect(() => {
    if (activeTab !== 'quality' || qualityDegraded || qualityLoading || !qualityData) return;
    renderDefectChart();
    renderGaugeChart();
  }, [activeTab, qualityData, qualityLoading, qualityDegraded]);

  const renderDefectChart = () => {
    const container = chartRef.current;
    if (!container) return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const echarts = require('echarts');
      const chart = echarts.init(container);
      const trend = qualityData?.defect_trend || [];
      chart.setOption({
        tooltip: { trigger: 'axis' },
        grid: { top: 20, right: 16, bottom: 28, left: 40 },
        xAxis: { type: 'category', data: trend.map((d: { date: string; count: number }) => d.date), axisLabel: { fontSize: 10 } },
        yAxis: { type: 'value', axisLabel: { fontSize: 10 } },
        series: [{
          type: 'line', data: trend.map((d: { date: string; count: number }) => d.count),
          smooth: true, lineStyle: { color: '#3b82f6', width: 2 },
          itemStyle: { color: '#3b82f6' }, areaStyle: { color: 'rgba(59,130,246,0.12)' },
        }],
      });
      return () => chart.dispose();
    } catch { /* echarts not available */ }
  };

  const renderGaugeChart = () => {
    const container = gaugeRef.current;
    if (!container) return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const echarts = require('echarts');
      const chart = echarts.init(container);
      const score = qualityData?.tech_debt_score ?? 0;
      chart.setOption({
        series: [{
          type: 'gauge', startAngle: 200, endAngle: -20,
          min: 0, max: 100,
          detail: { formatter: '{value}', fontSize: 18, offsetCenter: [0, '60%'] },
          data: [{ value: score, name: '技术债务' }],
          axisLine: { lineStyle: { width: 12, color: [[0.3, '#ef4444'], [0.7, '#f59e0b'], [1, '#10b981']] } },
          pointer: { width: 4 },
          axisTick: { show: false },
          splitLine: { show: false },
          axisLabel: { show: false },
          title: { offsetCenter: [0, '80%'], fontSize: 12 },
        }],
      });
      return () => chart.dispose();
    } catch { /* echarts not available */ }
  };

  const pipelineStatus = statusData?.data?.status || null;
  const pipelineColor = pipelineStatus ? (statusColorMap[pipelineStatus] || '#6b7280') : '#6b7280';

  const tabStyle = (key: TabKey): React.CSSProperties => ({
    padding: '4px 12px',
    fontSize: '11px',
    fontWeight: activeTab === key ? 700 : 500,
    color: activeTab === key ? 'var(--accent-cyan)' : 'var(--text-muted)',
    borderBottom: activeTab === key ? '2px solid var(--accent-cyan)' : '2px solid transparent',
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    outline: 'none',
    whiteSpace: 'nowrap',
  });

  return (
    <div style={{
      background: 'rgba(255,255,255,0.72)',
      border: '1px solid rgba(255,255,255,0.35)',
      borderRadius: '16px',
      padding: '16px',
      marginBottom: '16px',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      boxShadow: '0 8px 30px rgba(0,0,0,0.04)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <Activity size={16} style={{ color: 'var(--accent-cyan)', flexShrink: 0 }} />
        <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: 0, whiteSpace: 'nowrap' }}>
          CI/CD 构建状态
        </h3>
      </div>
      <div style={{ display: 'flex', gap: '4px', marginBottom: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
        <button style={tabStyle('status')} onClick={() => setActiveTab('status')}>构建</button>
        <button style={tabStyle('quality')} onClick={() => setActiveTab('quality')}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
            <FileBarChart size={12} />质量报告
          </span>
        </button>
      </div>

      {activeTab === 'status' && (
        <>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
              <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
              加载中...
            </div>
          ) : statusData && statusData.data ? (
            <div style={{ marginBottom: '12px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                borderRadius: '10px',
                background: `${pipelineColor}15`,
                border: `1px solid ${pipelineColor}30`,
              }}>
                <StatusIcon status={pipelineStatus} color={pipelineColor} />
                <span style={{ fontSize: '12px', fontWeight: 600, color: pipelineColor }}>
                  {statusData.data.name}: {statusLabelMap[pipelineStatus] || pipelineStatus}
                </span>
                {pipelineStatus === 'running' && (
                  <span style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: pipelineColor,
                    animation: 'pulse 1.5s ease-in-out infinite',
                    marginLeft: '4px',
                  }} />
                )}
              </div>
              {statusData.data.commit_id && (
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '6px', paddingLeft: '4px' }}>
                  Commit: {statusData.data.commit_id.substring(0, 8)} | 
                  {statusData.data.started_at ? ` 开始: ${new Date(statusData.data.started_at).toLocaleTimeString()}` : ''}
                </div>
              )}
            </div>
          ) : (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 12px',
              borderRadius: '10px',
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              fontSize: '12px',
              color: 'var(--accent-red)',
            }}>
              <AlertTriangle size={12} />
              构建状态获取失败
            </div>
          )}

          {logs && logs.data && logs.data.length > 0 && (
            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                最近构建日志
              </div>
              <div style={{
                maxHeight: '140px',
                overflowY: 'auto',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: 'rgba(0,0,0,0.02)',
              }}>
                {logs.data.slice(0, 10).map((log, i) => {
                  const logColor = statusColorMap[log.status] || '#6b7280';
                  return (
                    <div key={i} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '5px 10px',
                      borderBottom: '1px solid var(--border-color)',
                      fontSize: '11px',
                    }}>
                      <span style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: logColor,
                        flexShrink: 0,
                      }} />
                      <span style={{ color: 'var(--text-primary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {log.name}
                      </span>
                      <span style={{ color: logColor, fontWeight: 600, flexShrink: 0 }}>
                        {statusLabelMap[log.status] || log.status}
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
          {qualityLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
              <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
              加载质量报告...
            </div>
          ) : qualityDegraded ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 12px',
              borderRadius: '10px',
              background: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.2)',
              fontSize: '12px',
              color: '#f59e0b',
            }}>
              <AlertTriangle size={12} />
              Insight API 暂不可用，质量报告处于降级模式
            </div>
          ) : qualityData ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  缺陷趋势
                </div>
                <div ref={chartRef} style={{ width: '100%', height: '160px' }} />
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    技术债务评分
                  </div>
                  <div ref={gaugeRef} style={{ width: '100%', height: '120px' }} />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    代码重复率
                  </div>
                  <div style={{
                    fontSize: '28px',
                    fontWeight: 700,
                    color: (qualityData.code_duplication_rate ?? 0) > 10 ? '#ef4444' : (qualityData.code_duplication_rate ?? 0) > 5 ? '#f59e0b' : '#10b981',
                  }}>
                    {(qualityData.code_duplication_rate ?? 0).toFixed(1)}%
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {(qualityData.code_duplication_rate ?? 0) > 10 ? '偏高' : (qualityData.code_duplication_rate ?? 0) > 5 ? '中等' : '良好'}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>暂无质量报告数据</div>
          )}
        </>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.8); }
        }
      `}</style>
    </div>
  );
};

export default CICDStatusPanel;
