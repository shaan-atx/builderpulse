export async function fetchAnthropicUsage(
  startDate: string,
  endDate: string,
): Promise<Record<string, number>> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return {};

  try {
    const url = new URL('https://api.anthropic.com/v1/usage');
    url.searchParams.set('start_date', startDate);
    url.searchParams.set('end_date', endDate);

    const res = await fetch(url.toString(), {
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      next: { revalidate: 3600 },
    });

    if (!res.ok) return {};

    const json = await res.json() as { data?: Array<{ date: string; input_tokens?: number; output_tokens?: number }> };
    const result: Record<string, number> = {};

    for (const entry of json.data ?? []) {
      const tokens = (entry.input_tokens ?? 0) + (entry.output_tokens ?? 0);
      result[entry.date] = (result[entry.date] ?? 0) + tokens;
    }

    return result;
  } catch {
    return {};
  }
}
