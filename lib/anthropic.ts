import { cached } from './cache';
import { calcAnthropicCost } from './pricing';

interface UsageResult {
  model?: string;
  input_tokens?: number;
  output_tokens?: number;
  uncached_input_tokens?: number;
  cached_input_tokens?: number;
  cache_creation_input_tokens?: number;
}

interface UsageBucket {
  starting_at: string;
  ending_at: string;
  results: UsageResult[];
}

interface UsageResponse {
  data: UsageBucket[];
  has_more: boolean;
  next_page?: string | null;
}

export interface AnthropicUsageData {
  byDate: Record<string, number>;
  estimatedCost: number;
}

async function _fetchAnthropicUsage(
  startDate: string,
  endDate: string,
): Promise<AnthropicUsageData | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return { byDate: {}, estimatedCost: 0 };

  const headers = {
    'x-api-key': key,
    'anthropic-version': '2023-06-01',
  };

  const byDate: Record<string, number> = {};
  let estimatedCost = 0;
  let nextPage: string | undefined;

  do {
    const url = new URL('https://api.anthropic.com/v1/organizations/usage_report/messages');
    url.searchParams.set('starting_at',  `${startDate}T00:00:00Z`);
    url.searchParams.set('ending_at',    `${endDate}T23:59:59Z`);
    url.searchParams.set('bucket_width', '1d');
    if (nextPage) url.searchParams.set('page', nextPage);

    let res: Response;
    try {
      res = await fetch(url.toString(), { headers, cache: 'no-store' });
    } catch {
      break;
    }

    if (!res.ok) {
      if (res.status === 401) console.warn('[anthropic] 401 — key needs to be an Admin API key (sk-ant-admin-...)');
      else if (res.status === 429) { console.warn('[anthropic] 429 rate limited'); return null; }
      else console.error('[anthropic]', res.status, await res.text());
      break;
    }

    const json = await res.json() as UsageResponse;

    for (const bucket of json.data ?? []) {
      const date = bucket.starting_at.split('T')[0];
      for (const r of bucket.results ?? []) {
        const uncached  = r.input_tokens ?? r.uncached_input_tokens ?? 0;
        const cached    = r.cached_input_tokens ?? 0;
        const creation  = r.cache_creation_input_tokens ?? 0;
        const output    = r.output_tokens ?? 0;
        const tokens    = uncached + cached + creation + output;

        byDate[date] = (byDate[date] ?? 0) + tokens;
        estimatedCost += calcAnthropicCost(r.model ?? '', uncached, cached, creation, output);
      }
    }

    nextPage = json.has_more && json.next_page ? json.next_page : undefined;
  } while (nextPage);

  return { byDate, estimatedCost };
}

export function fetchAnthropicUsage(
  startDate: string,
  endDate: string,
): Promise<AnthropicUsageData | null> {
  return cached(`anthropic:${startDate}:${endDate}`, 60 * 60 * 1000, () =>
    _fetchAnthropicUsage(startDate, endDate),
  );
}
