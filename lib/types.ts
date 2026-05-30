export interface UsageDay {
  date: string;
  anthropic: number;
  openai: number;
  manual: number;
  total: number;
}

export interface ManualSession {
  id: string;
  date: string;
  tokens_estimated: number;
  source: 'claude.ai' | 'chatgpt' | 'other';
  note?: string;
  created_at: string;
}

export type ColorScheme = 'purple' | 'green' | 'orange' | 'blue';
export type Theme = 'dark' | 'light';
export type Source = 'all' | 'anthropic' | 'openai' | 'manual';
