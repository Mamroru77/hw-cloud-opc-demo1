import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

interface CustomEChartProps {
  option: Record<string, any>;
  style?: React.CSSProperties;
  className?: string;
}

export const CustomEChart: React.FC<CustomEChartProps> = ({ option, style, className }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const instance = echarts.init(el);
    chartRef.current = instance;

    const observer = new ResizeObserver(() => {
      instance.resize();
    });
    observer.observe(el);

    return () => {
      observer.disconnect();
      instance.dispose();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (chartRef.current && option) {
      chartRef.current.setOption(option, true);
    }
  }, [option]);

  return <div ref={containerRef} className={className} style={style} />;
};
