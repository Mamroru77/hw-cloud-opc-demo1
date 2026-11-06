import React from 'react';
import { Wifi, WifiOff, Shield } from 'lucide-react';

interface HarmonyWidgetProps {
  paperTitle: string;
  paramCount: number;
  ragScore: number;
  syncStatus: 'synced' | 'offline' | 'syncing';
  domain?: string;
  targetDepartment?: string;
}

const HarmonyWidget: React.FC<HarmonyWidgetProps> = ({
  paperTitle,
  paramCount,
  ragScore,
  syncStatus,
  domain = 'devices',
  targetDepartment = '肝胆外科',
}) => {
  const domainLabel = domain === 'drugs' ? '创新药物' :
                      domain === 'ai' ? '医疗 SaMD' :
                      domain === 'surgical' ? '改良术式' : '荧光探针';

  const ragColor = ragScore >= 80 ? '#10b981' : ragScore >= 60 ? '#f59e0b' : '#ef4444';

  return (
    <div className="hmos-widget hmos-widget-root">
      <div className="hmos-widget-topbar" />

      <div className="hmos-widget-header">
        <div className="hmos-widget-brand">
          <div className="hmos-widget-logo">云</div>
          <span className="hmos-widget-brand-text">
            云脉 ArkUI 服务卡片
          </span>
        </div>
        <div className="hmos-widget-sync">
          {syncStatus === 'synced' ? (
            <Wifi size={12} style={{ color: 'var(--accent-cyan)' }} />
          ) : syncStatus === 'syncing' ? (
            <Wifi size={12} style={{ color: '#f59e0b' }} />
          ) : (
            <WifiOff size={12} style={{ color: 'rgba(255,255,255,0.4)' }} />
          )}
          <span className="hmos-widget-sync-text" style={{
            color: syncStatus === 'synced' ? 'var(--accent-cyan)' : syncStatus === 'syncing' ? '#f59e0b' : 'rgba(255,255,255,0.4)',
          }}>
            {syncStatus === 'synced' ? '已同步' : syncStatus === 'syncing' ? '同步中' : '离线'}
          </span>
        </div>
      </div>

      <div className="hmos-widget-title">
        {paperTitle || '学术文献'}
      </div>

      <div className="hmos-widget-grid">
        <div className="hmos-widget-cell">
          <div className="hmos-widget-cell-label">细分领域</div>
          <div className="hmos-widget-cell-value" style={{ color: 'var(--accent-cyan)' }}>{domainLabel}</div>
        </div>
        <div className="hmos-widget-cell">
          <div className="hmos-widget-cell-label">目标科室</div>
          <div className="hmos-widget-cell-value">{targetDepartment}</div>
        </div>
        <div className="hmos-widget-cell">
          <div className="hmos-widget-cell-label">提取参数</div>
          <div className="hmos-widget-cell-value">{paramCount} 项</div>
        </div>
        <div className="hmos-widget-cell">
          <div className="hmos-widget-cell-label">RAG 合规评分</div>
          <div className="hmos-widget-cell-value" style={{ color: ragColor }}>{ragScore}%</div>
        </div>
      </div>

      <div className="hmos-widget-footer">
        <Shield size={10} />
        <span>NPU 端侧隐私脱敏保护已启用</span>
      </div>
    </div>
  );
};

export default HarmonyWidget;
