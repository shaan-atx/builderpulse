// Thin wrapper around @vercel/kv.
// If KV env vars aren't set (local dev without KV), all ops are no-ops.
import { kv } from '@vercel/kv';

function isConfigured(): boolean {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

export async function kvGet<T>(key: string): Promise<T | null> {
  if (!isConfigured()) return null;
  try {
    return await kv.get<T>(key);
  } catch {
    return null;
  }
}

export async function kvSet<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  if (!isConfigured()) return;
  try {
    await kv.set(key, JSON.parse(JSON.stringify(value)), { ex: ttlSeconds });
  } catch {}
}
