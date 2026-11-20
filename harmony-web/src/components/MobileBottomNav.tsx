import React from 'react';
import { FileStack, Activity, FileText, Bot } from 'lucide-react';

export type MobileSection = 'papers' | 'params' | 'docs' | 'copilot';

interface MobileBottomNavProps {
  activeSection: MobileSection;
  onSelectSection: (section: MobileSection) => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeSection,
  onSelectSection,
}) => {
  const items: Array<{ id: MobileSection; label: string; icon: React.ReactNode }> = [
    { id: 'papers', label: '论文', icon: <FileStack size={17} /> },
    { id: 'params', label: '指标参数', icon: <Activity size={17} /> },
    { id: 'docs', label: '文档', icon: <FileText size={17} /> },
    { id: 'copilot', label: '医算子 AI', icon: <Bot size={17} /> },
  ];

  return (
    <nav className="ym-mobile-nav" aria-label="移动端主导航">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className={`ym-mobile-nav-btn ${activeSection === item.id ? 'active' : ''}`}
          aria-current={activeSection === item.id ? 'page' : undefined}
          onClick={() => onSelectSection(item.id)}
        >
          {item.icon}
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
};
