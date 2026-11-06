import React, { useState, useEffect } from 'react';

interface PipelineStatusWidgetProps {
  backendUrl?: string;
}

const PipelineStatusWidget: React.FC<PipelineStatusWidgetProps> = ({ backendUrl = 'http://127.0.0.1:8000/api/cicd' }) => {
  const [status, setStatus] = useState<string | null>(null);
  const [pipelineName, setPipelineName] = useState<string>('');

  const statusColorMap: Record<string, string> = {
    queued: '#f59e0b',
    running: '#3b82f6',
    success: '#10b981',
    completed: '#10b981',
    failed: '#ef4444',
  };

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`${backendUrl}/pipeline/status`);
        const data = await res.json();
        if (data?.data) {
          setStatus(data.data.status);
          setPipelineName(data.data.name || '');
        }
      } catch {
        setStatus(null);
      }
    };
    poll();
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, [backendUrl]);

  const color = status ? (statusColorMap[status] || '#6b7280') : '#6b7280';
  const label = status === 'running' ? '构建中' : status === 'success' || status === 'completed' ? '已通过' : status === 'failed' ? '失败' : status === 'queued' ? '排队' : '离线';

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '3px 10px',
      borderRadius: '20px',
      background: `${color}15`,
      border: `1px solid ${color}30`,
      fontSize: '10px',
      fontWeight: 600,
      color,
    }}>
      <span style={{
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        backgroundColor: color,
        animation: status === 'running' ? 'pipeline-pulse 1.5s ease-in-out infinite' : 'none',
      }} />
      <span>{pipelineName ? `${pipelineName}: ${label}` : `CI/CD: ${label}`}</span>

      <style>{`
        @keyframes pipeline-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.3; transform: scale(0.7); }
        }
      `}</style>
    </div>
  );
};

export default PipelineStatusWidget;
