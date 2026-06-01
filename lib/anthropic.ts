import { unstable_cache } from 'next/cache';
import { calcAnthropicCost } from './pricing';
import { kvGet, kvSet } from './kv';

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

export interface ModelUsage {
  tokens: number;
  cost: number;
}

export interface AnthropicUsageData {
  byDate: Record<string, number>;
  estimatedCost: number;
  byModel: Record<string, ModelUsage>;
}

async function _fetchFromAPI(
  startDate: string,
  endDate: string,
): Promise<AnthropicUsageData | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return { byDate: {}, estimatedCost: 0, byModel: {} };

  const headers = { 'x-api-key': key, 'anthropic-version': '2023-06-01' };
  const byDate: Record<string, number> = {};
  const byModel: Record<string, ModelUsage> = {};
  let estimatedCost = 0;
  let nextPage: string | undefined;

  do {
    const url = new URL('https://api.anthropic.com/v1/organizations/usage_report/messages');
    url.searchParams.set('starting_at',  `${startDate}T00:00:00Z`);
    url.searchParams.set('ending_at',    `${endDate}T23:59:59Z`);
    url.searchParams.set('bucket_width', '1d');
    if (nextPage) url.searchParams.set('page', nextPage);

    let res: Response;
    try { res = await fetch(url.toString(), { headers, cache: 'no-store' }); }
    catch { break; }

    if (!res.ok) {
      if (res.status === 401) console.warn('[anthropic] 401 — needs Admin API key (sk-ant-admin-...)');
      else if (res.status === 429) { console.warn('[anthropic] 429 rate limited'); return null; }
      else console.error('[anthropic]', res.status, await res.text());
      break;
    }

    const json = await res.json() as UsageResponse;
    for (const bucket of json.data ?? []) {
      const date = bucket.starting_at.split('T')[0];
      for (const r of bucket.results ?? []) {
        const uncached = r.input_tokens ?? r.uncached_input_tokens ?? 0;
        const cached   = r.cached_input_tokens ?? 0;
        const creation = r.cache_creation_input_tokens ?? 0;
        const output   = r.output_tokens ?? 0;
        const tokens   = uncached + cached + creation + output;
        const cost     = calcAnthropicCost(r.model ?? '', uncached, cached, creation, output);
        byDate[date]   = (byDate[date] ?? 0) + tokens;
        estimatedCost += cost;
        const model = r.model ?? 'unknown';
        byModel[model] = { tokens: (byModel[model]?.tokens ?? 0) + tokens, cost: (byModel[model]?.cost ?? 0) + cost };
      }
    }
    nextPage = json.has_more && json.next_page ? json.next_page : undefined;
  } while (nextPage);

  return { byDate, estimatedCost, byModel };
}

// unstable_cache: in-process cache within a single Vercel function instance.
// Throws are not cached so rate limits always retry.
const _unstableCached = unstable_cache(
  async (startDate: string, endDate: string): Promise<AnthropicUsageData> => {
    const result = await _fetchFromAPI(startDate, endDate);
    if (result === null) throw new Error('rate-limited');
    return result;
  },
  ['anthropic-usage'],
  { revalidate: 86400 },
);

export async function fetchAnthropicUsage(
  startDate: string,
  endDate: string,
): Promise<AnthropicUsageData | null> {
  // 1. KV data cache — survives across deployments and cold starts
  const kvHit = await kvGet<AnthropicUsageData>('anthropic:usage:365d');
  if (kvHit) return kvHit;

  // 2. KV backoff — if rate limited recently, don't hammer the API on every request
  const backoffUntil = await kvGet<number>('anthropic:backoff');
  if (backoffUntil && backoffUntil > Date.now()) {
    console.warn(`[anthropic] in backoff until ${new Date(backoffUntil).toLocaleTimeString()}`);
    return null;
  }

  // 3. Fetch from API
  try {
    const result = await _unstableCached(startDate, endDate);
    await kvSet('anthropic:usage:365d', result, 86400);
    return result;
  } catch {
    // Rate limited — back off for 30 min so we don't keep hammering the API
    await kvSet('anthropic:backoff', Date.now() + 30 * 60 * 1000, 1800);
    return null;
  }
}
