export interface ProviderMeta {
  id: string;
  label: string;
  shortLabel: string;
  modelName: string;
}

export const MODEL_PROVIDERS: ProviderMeta[] = [
  { id: 'DeepSeek', label: 'DeepSeek', shortLabel: 'DeepSeek-R1', modelName: 'deepseek-chat (V3/R1)' },
  { id: 'OpenAI', label: 'OpenAI', shortLabel: 'OpenAI', modelName: 'gpt-4o-mini' },
  { id: 'Huawei Pangu', label: '华为盘古', shortLabel: '华为盘古', modelName: 'Huawei Pangu' },
  { id: 'Google Gemini', label: 'Google Gemini', shortLabel: 'Gemini', modelName: 'gemini-1.5-flash' },
  { id: 'OpenRouter', label: 'OpenRouter', shortLabel: 'OpenRouter', modelName: 'google/gemini-2.5-flash' },
];

export function getProviderMeta(provider: string): ProviderMeta {
  const lower = (provider || '').toLowerCase();
  if (lower.includes('openai')) return MODEL_PROVIDERS[1];
  if (lower.includes('pangu') || lower.includes('huawei')) return MODEL_PROVIDERS[2];
  if (lower.includes('gemini')) return MODEL_PROVIDERS[3];
  if (lower.includes('openrouter')) return MODEL_PROVIDERS[4];
  return MODEL_PROVIDERS[0];
}
