interface UsageResult {
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

export async function fetchOpenAIUsage(
  startDate: string,
  endDate: string,
): Promise<Record<string, number>> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return {};

  const headers = { Authorization: `Bearer ${key}` };
  const startTs = Math.floor(new Date(startDate).getTime() / 1000);
  const endTs   = Math.floor(new Date(endDate + 'T23:59:59Z').getTime() / 1000);

  const result: Record<string, number> = {};
  let nextPage: string | undefined;

  do {
    const url = new URL('https://api.openai.com/v1/organization/usage/completions');
    url.searchParams.set('start_time',   String(startTs));
    url.searchParams.set('end_time',     String(endTs));
    url.searchParams.set('bucket_width', '1d');
    if (nextPage) url.searchParams.set('page', nextPage);

    let res: Response;
    try {
      res = await fetch(url.toString(), { headers });
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
      const tokens = (bucket.results ?? []).reduce((sum, r) => {
        return sum + (r.input_tokens ?? 0) + (r.output_tokens ?? 0);
      }, 0);
      result[date] = (result[date] ?? 0) + tokens;
    }

    nextPage = json.has_more && json.next_page ? json.next_page : undefined;
  } while (nextPage);

  return result;
}
