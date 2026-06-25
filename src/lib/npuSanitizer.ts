export interface SanitizeRule {
  name: string;
  pattern: RegExp;
  replacement: string;
}

export interface SanitizeResult {
  original: string;
  sanitized: string;
  fields_sanitized: number;
  rules_applied: string[];
  is_safe_for_transmission: boolean;
}

const SANITIZE_RULES: SanitizeRule[] = [
  { name: '患者ID', pattern: /P\d{8}/g, replacement: '[已脱敏-患者ID]' },
  { name: '医疗机构', pattern: /北京协和医院|上海中山医院|华东地区三甲医院/g, replacement: '[已脱敏-医疗机构]' },
  { name: '医师姓名', pattern: /(主任医师|副主任医师|主治医师)\s*\S{2,4}/g, replacement: '$1 [已脱敏-姓名]' },
  { name: '电话号码', pattern: /1[3-9]\d{9}/g, replacement: '[已脱敏-电话]' },
  { name: '身份证号', pattern: /\d{17}[\dXx]/g, replacement: '[已脱敏-身份证号]' },
  { name: '患者姓名', pattern: /患者[：:]\s*\S{2,4}/g, replacement: '患者：[已脱敏-姓名]' },
];

export function npuSanitize(text: string): SanitizeResult {
  let sanitized = text;
  const rulesApplied: string[] = [];
  let fieldsSanitized = 0;

  for (const rule of SANITIZE_RULES) {
    const matches = sanitized.match(rule.pattern);
    if (matches && matches.length > 0) {
      rulesApplied.push(rule.name);
      fieldsSanitized += matches.length;
      sanitized = sanitized.replace(rule.pattern, rule.replacement);
    }
  }

  return {
    original: text,
    sanitized,
    fields_sanitized: fieldsSanitized,
    rules_applied: rulesApplied,
    is_safe_for_transmission: fieldsSanitized === 0 || sanitized !== text,
  };
}

export { SANITIZE_RULES };
