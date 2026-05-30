interface Entry<T> {
  value: T;
  expiresAt: number;
}

const store = new Map<string, Entry<unknown>>();

// Only caches non-null results — null signals a transient failure (rate limit, network)
export async function cached<T>(
  key: string,
  ttlMs: number,
  fn: () => Promise<T | null>,
): Promise<T | null> {
  const hit = store.get(key) as Entry<T> | undefined;
  if (hit && hit.expiresAt > Date.now()) return hit.value;

  const value = await fn();
  if (value !== null) {
    store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }
  return value;
}
