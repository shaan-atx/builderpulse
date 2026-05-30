export async function fetchOpenAIUsage(
  startDate: string,
  endDate: string,
): Promise<Record<string, number>> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return {};

  try {
    const startTs = Math.floor(new Date(startDate).getTime() / 1000);
    const endTs = Math.floor(new Date(endDate + 'T23:59:59Z').getTime() / 1000);

    const url = `https://api.openai.com/v1/usage?start_time=${startTs}&end_time=${endTs}&bucket_width=1d`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${key}` },
      next: { revalidate: 3600 },
    });

    if (!res.ok) return {};

    const json = await res.json() as {
      data?: Array<{ start_time: number; input_tokens?: number; output_tokens?: number }>;
    };
    const result: Record<string, number> = {};

    for (const bucket of json.data ?? []) {
      const date = new Date(bucket.start_time * 1000).toISOString().split('T')[0];
      const tokens = (bucket.input_tokens ?? 0) + (bucket.output_tokens ?? 0);
      result[date] = (result[date] ?? 0) + tokens;
    }

    return result;
  } catch {
    return {};
  }
}
