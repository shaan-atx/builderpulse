import { cached } from './cache';
import { calcOpenAICost } from './pricing';

interface UsageResult {
  model?: string;
  input_tokens?: number;
  output_tokens?: number;
  input_cached_tokens?: number;
}

interface UsageBucket {
  start_time: number;
  end_time: number;
  results: UsageResult[];
}

interface UsageResponse {
  data: UsageBucket[];
  has_more: boolean;
  next_page?: string | null;
}

export interface ModelUsage {
  tokens: number;
  cost: number;
}

export interface OpenAIUsageData {
  byDate: Record<string, number>;
  estimatedCost: number;
  byModel: Record<string, ModelUsage>;
}

async function _fetchOpenAIUsage(
  startDate: string,
  endDate: string,
): Promise<OpenAIUsageData | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return { byDate: {}, estimatedCost: 0 };

  const headers = { Authorization: `Bearer ${key}` };
  const startTs = Math.floor(new Date(startDate).getTime() / 1000);
  const endTs   = Math.floor(new Date(endDate + 'T23:59:59Z').getTime() / 1000);

  const byDate: Record<string, number> = {};
  const byModel: Record<string, ModelUsage> = {};
  let estimatedCost = 0;
  let nextPage: string | undefined;

  do {
    const url = new URL('https://api.openai.com/v1/organization/usage/completions');
    url.searchParams.set('start_time',   String(startTs));
    url.searchParams.set('end_time',     String(endTs));
    url.searchParams.set('bucket_width', '1d');
    if (nextPage) url.searchParams.set('page', nextPage);

    let res: Response;
    try {
      res = await fetch(url.toString(), { headers, cache: 'no-store' });
    } catch {
      break;
    }

    if (!res.ok) {
      if (res.status === 403) console.warn('[openai] 403 — key needs the api.usage.read scope');
      else console.error('[openai]', res.status, await res.text());
      break;
    }

    const json = await res.json() as UsageResponse;

    for (const bucket of json.data ?? []) {
      const date = new Date(bucket.start_time * 1000).toISOString().split('T')[0];
      for (const r of bucket.results ?? []) {
        const input  = r.input_tokens ?? 0;
        const cached = r.input_cached_tokens ?? 0;
        const output = r.output_tokens ?? 0;
        const tokens = input + output;

        const cost = calcOpenAICost(r.model ?? '', input, cached, output);
        byDate[date] = (byDate[date] ?? 0) + tokens;
        estimatedCost += cost;
        const model = r.model ?? 'unknown';
        byModel[model] = { tokens: (byModel[model]?.tokens ?? 0) + tokens, cost: (byModel[model]?.cost ?? 0) + cost };
      }
    }

    nextPage = json.has_more && json.next_page ? json.next_page : undefined;
  } while (nextPage);

  return { byDate, estimatedCost, byModel };
}

export function fetchOpenAIUsage(
  startDate: string,
  endDate: string,
): Promise<OpenAIUsageData | null> {
  return cached(`openai:${startDate}:${endDate}`, 60 * 60 * 1000, () =>
    _fetchOpenAIUsage(startDate, endDate),
  );
}
