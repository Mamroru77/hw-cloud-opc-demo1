import type { AppParams, RobotMatch } from '../lib/types';

export function buildPkChartOption(state: AppParams) {
  const domain = state.domain || 'devices';
  const axisLabelColor = '#64748B';
  const gridLineColor = '#F1F4F8';

  if (domain === 'ai') {
    const data: Array<[number, number]> = [];
    const accuracyVal = Math.min(99.5, Math.max(50, state.accuracy || 92.4));
    const p = Math.max(0.01, 1.0 - accuracyVal / 100);
    for (let x = 0; x <= 1.001; x += 0.05) {
      const y = Math.pow(x, p);
      data.push([parseFloat(x.toFixed(2)), parseFloat(y.toFixed(3))]);
    }
    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#FFFFFF',
        borderColor: '#E2E8F0',
        textStyle: { color: '#0F172A', fontSize: 12 },
        formatter: (params: any) => {
          const pt = Array.isArray(params) ? params[0] : params;
          return `FPR (1-特异度): <b>${pt.data[0]}</b><br/>TPR (敏感度): <b>${pt.data[1]}</b>`;
        },
      },
      grid: { left: 46, right: 20, bottom: 38, top: 26 },
      xAxis: {
        type: 'value',
        name: 'FPR',
        nameLocation: 'end',
        nameTextStyle: { color: axisLabelColor, fontSize: 11 },
        splitLine: { show: true, lineStyle: { color: gridLineColor } },
        axisLine: { lineStyle: { color: '#E2E8F0' } },
        axisLabel: { color: axisLabelColor, fontSize: 11 },
        min: 0,
        max: 1,
      },
      yAxis: {
        type: 'value',
        name: 'TPR',
        nameTextStyle: { color: axisLabelColor, fontSize: 11 },
        splitLine: { show: true, lineStyle: { color: gridLineColor } },
        axisLabel: { color: axisLabelColor, fontSize: 11 },
        min: 0,
        max: 1,
      },
      series: [
        {
          data,
          type: 'line',
          smooth: true,
          showSymbol: false,
          lineStyle: { color: '#2563EB', width: 2.5 },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(37, 99, 235, 0.16)' },
                { offset: 1, color: 'rgba(37, 99, 235, 0.0)' },
              ],
            },
          },
        },
      ],
    };
  }

  if (domain === 'surgical') {
    const data: Array<[number, number]> = [];
    const tPlateau = 90;
    const tStart = 220;
    const targetCases = Math.max(5, state.learning_curve_cases || 25);
    const b = 3.0 / targetCases;
    for (let n = 1; n <= 50; n++) {
      const time = tPlateau + (tStart - tPlateau) * Math.exp(-b * (n - 1));
      data.push([n, Math.round(time)]);
    }
    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#FFFFFF',
        borderColor: '#E2E8F0',
        textStyle: { color: '#0F172A', fontSize: 12 },
        formatter: (params: any) => {
          const pt = Array.isArray(params) ? params[0] : params;
          return `第 ${pt.data[0]} 例<br/>平均用时: <b>${pt.data[1]} min</b>`;
        },
      },
      grid: { left: 48, right: 20, bottom: 38, top: 26 },
      xAxis: {
        type: 'value',
        name: '累积例数',
        nameTextStyle: { color: axisLabelColor, fontSize: 11 },
        splitLine: { show: true, lineStyle: { color: gridLineColor } },
        axisLine: { lineStyle: { color: '#E2E8F0' } },
        axisLabel: { color: axisLabelColor, fontSize: 11 },
        min: 1,
        max: 50,
      },
      yAxis: {
        type: 'value',
        name: '手术时间 (min)',
        nameTextStyle: { color: axisLabelColor, fontSize: 11 },
        splitLine: { show: true, lineStyle: { color: gridLineColor } },
        axisLabel: { color: axisLabelColor, fontSize: 11 },
        min: 80,
        max: 230,
      },
      series: [
        {
          data,
          type: 'line',
          smooth: true,
          showSymbol: false,
          lineStyle: { color: '#D97706', width: 2.5 },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(217, 119, 6, 0.16)' },
                { offset: 1, color: 'rgba(217, 119, 6, 0.0)' },
              ],
            },
          },
        },
      ],
    };
  }

  // devices or drugs: single-compartment exponential PK clearance curve
  const data: Array<[number, number]> = [];
  const tHalf = Math.max(
    0.5,
    domain === 'drugs' ? state.drug_half_life || 12.0 : state.half_life || 2.4
  );
  const k = Math.log(2) / tHalf;
  const maxT = domain === 'drugs' ? 96 : Math.max(24, Math.ceil(state.metabolic_cycle || 24));
  const step = domain === 'drugs' ? 2 : 0.5;

  for (let t = 0; t <= maxT + 0.001; t += step) {
    const conc = 100 * Math.exp(-k * t);
    data.push([parseFloat(t.toFixed(1)), parseFloat(conc.toFixed(2))]);
  }

  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#FFFFFF',
      borderColor: '#E2E8F0',
      textStyle: { color: '#0F172A', fontSize: 12 },
      formatter: (params: any) => {
        const pt = Array.isArray(params) ? params[0] : params;
        return `时间: <b>${pt.data[0]} h</b><br/>体内浓度: <b>${pt.data[1]}%</b>`;
      },
    },
    grid: { left: 46, right: 56, bottom: 38, top: 34 },
    xAxis: {
      type: 'value',
      name: '时间 (h)',
      nameGap: 8,
      nameTextStyle: { color: axisLabelColor, fontSize: 11 },
      splitLine: { show: true, lineStyle: { color: gridLineColor } },
      axisLine: { lineStyle: { color: '#E2E8F0' } },
      axisLabel: { color: axisLabelColor, fontSize: 11, formatter: '{value}h' },
      min: 0,
      max: maxT,
    },
    yAxis: {
      type: 'value',
      name: '体内浓度 (%)',
      nameTextStyle: { color: axisLabelColor, fontSize: 11 },
      splitLine: { show: true, lineStyle: { color: gridLineColor } },
      axisLabel: { color: axisLabelColor, fontSize: 11 },
      min: 0,
      max: 100,
    },
    series: [
      {
        data,
        type: 'line',
        smooth: true,
        showSymbol: false,
        lineStyle: { color: '#059669', width: 2.5 },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(5, 150, 105, 0.16)' },
              { offset: 1, color: 'rgba(5, 150, 105, 0.0)' },
            ],
          },
        },
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: { color: '#CBD5E1', type: 'dashed', width: 1 },
          label: {
            formatter: `T₁/₂ = ${tHalf}h · 50%`,
            rotate: 0,
            position: 'middle',
            align: 'left',
            offset: [8, 0],
            color: '#0F172A',
            fontSize: 11,
            fontWeight: 600,
            backgroundColor: '#FFFFFF',
            borderColor: '#E2E8F0',
            borderWidth: 1,
            borderRadius: 6,
            padding: [3, 7],
          },
          data: [{ xAxis: Math.min(tHalf, maxT) }],
        },
      },
    ],
  };
}

export function buildRadarChartOption(matchedRobots: RobotMatch[], domain: string) {
  let indicators = [
    { name: '光谱激发兼容', max: 100 },
    { name: '科室适用契合', max: 100 },
    { name: '装机覆盖占比', max: 100 },
    { name: '接口开放度', max: 100 },
    { name: '临床便利度', max: 100 },
  ];
  let seriesName = '兼容设备适配比对';

  if (domain === 'drugs') {
    indicators = [
      { name: '靶向亲和力', max: 100 },
      { name: '科室患者流量', max: 100 },
      { name: 'GCP 中心资质', max: 100 },
      { name: 'CDMO 配套度', max: 100 },
      { name: '伦理审查效率', max: 100 },
    ];
    seriesName = '临床基地与 CDMO 筛选比对';
  } else if (domain === 'ai') {
    indicators = [
      { name: '推理低延迟', max: 100 },
      { name: 'PACS 适配度', max: 100 },
      { name: '算力集群兼容', max: 100 },
      { name: '沙箱安全合规', max: 100 },
      { name: '阅片流便利度', max: 100 },
    ];
    seriesName = 'PACS 与推理集群适配比对';
  } else if (domain === 'surgical') {
    indicators = [
      { name: '降低并发症率', max: 100 },
      { name: '带教实训效率', max: 100 },
      { name: '核心器械兼容', max: 100 },
      { name: '术中质控稳定', max: 100 },
      { name: '术式推广便利', max: 100 },
    ];
    seriesName = '微创实训基地与手术室配套比对';
  }

  return {
    backgroundColor: 'transparent',
    tooltip: {
      backgroundColor: '#FFFFFF',
      borderColor: '#E2E8F0',
      textStyle: { color: '#0F172A', fontSize: 12 },
    },
    legend: {
      data: matchedRobots.map((r) => r.name),
      textStyle: { color: '#475569', fontSize: 11 },
      bottom: 0,
      itemWidth: 10,
      itemHeight: 10,
    },
    radar: {
      indicator: indicators,
      shape: 'circle',
      radius: '54%',
      center: ['50%', '46%'],
      splitNumber: 4,
      axisName: { color: '#475569', fontSize: 11 },
      axisNameGap: 10,
      splitLine: { lineStyle: { color: '#E2E8F0' } },
      splitArea: { show: false },
      axisLine: { lineStyle: { color: '#E2E8F0' } },
    },
    series: [
      {
        name: seriesName,
        type: 'radar',
        data: matchedRobots.map((robot, index) => {
          const valFactor = 1 - index * 0.08;
          const isDeptFitted = robot.compatibility_score > 90;
          return {
            value: [
              robot.compatibility_score,
              isDeptFitted ? 95 : 68,
              Math.min(100, Math.round(robot.national_installs / 4.5) + 20),
              Math.round(88 * valFactor),
              Math.round(92 * valFactor),
            ],
            name: robot.name,
            symbol: 'none',
            lineStyle: { width: 2 },
            areaStyle: { opacity: 0.08 },
          };
        }),
        color: ['#2563EB', '#059669', '#D97706'],
      },
    ],
  };
}
