import fs from 'fs';
import path from 'path';

interface Entry<T> {
  value: T;
  expiresAt: number;
}

const CACHE_FILE    = path.join(process.cwd(), 'data', 'usagecache.json');
const BACKOFF_FILE  = path.join(process.cwd(), 'data', 'backoff.json');
const memory        = new Map<string, Entry<unknown>>();

function loadFile(): Record<string, Entry<unknown>> {
  try {
    const dir = path.dirname(CACHE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(CACHE_FILE)) return {};
    return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
  } catch { return {}; }
}

function saveFile(store: Record<string, Entry<unknown>>) {
  try {
    const dir = path.dirname(CACHE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify(store, null, 2));
  } catch {}
}

function get<T>(key: string): T | undefined {
  const mem = memory.get(key) as Entry<T> | undefined;
  if (mem && mem.expiresAt > Date.now()) return mem.value;

  const disk = loadFile();
  const entry = disk[key] as Entry<T> | undefined;
  if (entry && entry.expiresAt > Date.now()) {
    memory.set(key, entry as Entry<unknown>);
    return entry.value;
  }
  return undefined;
}

function set<T>(key: string, value: T, ttlMs: number) {
  const entry: Entry<T> = { value, expiresAt: Date.now() + ttlMs };
  memory.set(key, entry as Entry<unknown>);
  const disk = loadFile();
  const now = Date.now();
  for (const k of Object.keys(disk)) {
    if (disk[k].expiresAt <= now) delete disk[k];
  }
  disk[key] = entry as Entry<unknown>;
  saveFile(disk);
}

// Per-key backoff: when a 429 is hit, block that key for 30 min
function isBackedOff(key: string): boolean {
  try {
    if (!fs.existsSync(BACKOFF_FILE)) return false;
    const store = JSON.parse(fs.readFileSync(BACKOFF_FILE, 'utf-8')) as Record<string, number>;
    return (store[key] ?? 0) > Date.now();
  } catch { return false; }
}

export function setBackoff(key: string, ms = 30 * 60 * 1000) {
  try {
    const dir = path.dirname(BACKOFF_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const store = fs.existsSync(BACKOFF_FILE)
      ? JSON.parse(fs.readFileSync(BACKOFF_FILE, 'utf-8')) as Record<string, number>
      : {};
    store[key] = Date.now() + ms;
    fs.writeFileSync(BACKOFF_FILE, JSON.stringify(store, null, 2));
    const retryAt = new Date(store[key]).toLocaleTimeString();
    console.warn(`[cache] ${key} backed off for 30 min — will retry after ${retryAt}`);
  } catch {}
}

// Only caches non-null results; respects backoff; null = transient failure
export async function cached<T>(
  key: string,
  ttlMs: number,
  fn: () => Promise<T | null>,
): Promise<T | null> {
  const hit = get<T>(key);
  if (hit !== undefined) return hit;

  if (isBackedOff(key)) return null;

  const value = await fn();
  if (value !== null) set(key, value, ttlMs);
  return value;
}
