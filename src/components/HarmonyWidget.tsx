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
    <div style={{
      borderRadius: '20px',
      background: 'rgba(255,255,255,0.12)',
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      padding: '18px',
      border: '1px solid rgba(255,255,255,0.18)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12), inset 0 1px 0 rgba(255,255,255,0.3)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '3px',
        background: 'linear-gradient(90deg, var(--accent-cyan), #a855f7, var(--accent-cyan))',
        borderRadius: '20px 20px 0 0',
      }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{
            width: '20px',
            height: '20px',
            borderRadius: '6px',
            background: 'linear-gradient(135deg, var(--accent-cyan), #a855f7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '10px',
            color: '#fff',
            fontWeight: 700,
          }}>云</div>
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>
            云脉 ArkUI 服务卡片
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {syncStatus === 'synced' ? (
            <Wifi size={12} style={{ color: 'var(--accent-cyan)' }} />
          ) : syncStatus === 'syncing' ? (
            <Wifi size={12} style={{ color: '#f59e0b' }} />
          ) : (
            <WifiOff size={12} style={{ color: 'rgba(255,255,255,0.4)' }} />
          )}
          <span style={{
            fontSize: '9px',
            color: syncStatus === 'synced' ? 'var(--accent-cyan)' : syncStatus === 'syncing' ? '#f59e0b' : 'rgba(255,255,255,0.4)',
            fontWeight: 600,
          }}>
            {syncStatus === 'synced' ? '已同步' : syncStatus === 'syncing' ? '同步中' : '离线'}
          </span>
        </div>
      </div>

      <div style={{
        fontSize: '13px',
        fontWeight: 700,
        color: 'rgba(255,255,255,0.95)',
        marginBottom: '12px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        lineHeight: 1.3,
      }}>
        {paperTitle || '学术文献'}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '8px',
      }}>
        <div style={{
          background: 'rgba(255,255,255,0.08)',
          borderRadius: '10px',
          padding: '8px 10px',
        }}>
          <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.5)', marginBottom: '2px' }}>细分领域</div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-cyan)' }}>{domainLabel}</div>
        </div>
        <div style={{
          background: 'rgba(255,255,255,0.08)',
          borderRadius: '10px',
          padding: '8px 10px',
        }}>
          <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.5)', marginBottom: '2px' }}>目标科室</div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>{targetDepartment}</div>
        </div>
        <div style={{
          background: 'rgba(255,255,255,0.08)',
          borderRadius: '10px',
          padding: '8px 10px',
        }}>
          <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.5)', marginBottom: '2px' }}>提取参数</div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>{paramCount} 项</div>
        </div>
        <div style={{
          background: 'rgba(255,255,255,0.08)',
          borderRadius: '10px',
          padding: '8px 10px',
        }}>
          <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.5)', marginBottom: '2px' }}>
            RAG 合规评分
          </div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: ragColor }}>{ragScore}%</div>
        </div>
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        marginTop: '10px',
        fontSize: '9px',
        color: 'rgba(255,255,255,0.35)',
      }}>
        <Shield size={10} />
        <span>NPU 端侧隐私脱敏保护已启用</span>
      </div>
    </div>
  );
};

export default HarmonyWidget;
