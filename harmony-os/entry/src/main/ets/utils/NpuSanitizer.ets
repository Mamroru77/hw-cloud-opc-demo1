// NPU 端侧隐私脱敏 — 6 条正则规则
// 移植自 harmony-web/src/lib/npuSanitizer.ts

import { SanitizeResult, SanitizeRule } from './HarmonyTypes';

const SANITIZE_RULES: SanitizeRule[] = [
  { name: '患者ID', pattern: 'P\\d{8}', replacement: '[已脱敏-患者ID]' },
  { name: '医疗机构', pattern: '北京协和医院|上海中山医院|华东地区三甲医院', replacement: '[已脱敏-医疗机构]' },
  { name: '医师姓名', pattern: '(主任医师|副主任医师|主治医师)\\s*\\S{2,4}', replacement: '$1 [已脱敏-姓名]' },
  { name: '电话号码', pattern: '1[3-9]\\d{9}', replacement: '[已脱敏-电话]' },
  { name: '身份证号', pattern: '\\d{17}[\\dXx]', replacement: '[已脱敏-身份证号]' },
  { name: '患者姓名', pattern: '患者[：:]\\s*\\S{2,4}', replacement: '患者：[已脱敏-姓名]' },
];

export function npuSanitize(text: string): SanitizeResult {
  let sanitized: string = text;
  const rulesApplied: string[] = [];
  let fieldsSanitized: number = 0;

  for (const rule of SANITIZE_RULES) {
    const regex = new RegExp(rule.pattern, 'g');
    const matches: RegExpMatchArray | null = sanitized.match(regex);
    if (matches && matches.length > 0) {
      rulesApplied.push(rule.name);
      fieldsSanitized += matches.length;
      sanitized = sanitized.replace(regex, rule.replacement);
    }
  }

  return {
    original: text,
    sanitized: sanitized,
    fieldsSanitized: fieldsSanitized,
    rulesApplied: rulesApplied,
    isSafeForTransmission: fieldsSanitized === 0 || sanitized !== text,
  };
}

export function getDefaultSanitizeSample(): string {
  return '北京协和医院 患者ID P20230101 由 主任医师陈建国 收治，患者：张晓明，联系电话 13800138000，身份证号 110101199001011234。';
}

export { SANITIZE_RULES };
