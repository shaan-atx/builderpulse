interface UsageBucket {
  timestamp: string;
  model: string;
  uncached_input_tokens: number;
  cached_input_tokens: number;
  cache_creation_input_tokens: number;
  output_tokens: number;
}

interface UsageResponse {
  data: UsageBucket[];
  has_more: boolean;
  next_page?: string | null;
}

export async function fetchAnthropicUsage(
  startDate: string,
  endDate: string,
): Promise<Record<string, number>> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return {};

  const headers = {
    'x-api-key': key,
    'anthropic-version': '2023-06-01',
  };

  const result: Record<string, number> = {};
  let nextPage: string | undefined;

  do {
    const url = new URL('https://api.anthropic.com/v1/organizations/usage_report/messages');
    url.searchParams.set('starting_at', `${startDate}T00:00:00Z`);
    url.searchParams.set('ending_at',   `${endDate}T23:59:59Z`);
    url.searchParams.set('bucket_width', '1d');
    if (nextPage) url.searchParams.set('page', nextPage);

    let res: Response;
    try {
      res = await fetch(url.toString(), { headers });
    } catch {
      break;
    }

    if (!res.ok) {
      if (res.status === 401) console.warn('[anthropic] 401 — key needs to be an Admin API key (sk-ant-admin-...)');
      else console.error('[anthropic]', res.status, await res.text());
      break;
    }

    const json = await res.json() as UsageResponse;

    for (const bucket of json.data ?? []) {
      const date = bucket.timestamp.split('T')[0];
      const tokens =
        (bucket.uncached_input_tokens       ?? 0) +
        (bucket.cached_input_tokens         ?? 0) +
        (bucket.cache_creation_input_tokens ?? 0) +
        (bucket.output_tokens               ?? 0);
      result[date] = (result[date] ?? 0) + tokens;
    }

    nextPage = json.has_more && json.next_page ? json.next_page : undefined;
  } while (nextPage);

  return result;
}
