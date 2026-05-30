import fs from 'fs';
import path from 'path';

interface Entry<T> {
  value: T;
  expiresAt: number;
}

const CACHE_FILE = path.join(process.cwd(), 'data', 'usagecache.json');
const memory = new Map<string, Entry<unknown>>();

function loadFile(): Record<string, Entry<unknown>> {
  try {
    const dir = path.dirname(CACHE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(CACHE_FILE)) return {};
    return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

function saveFile(store: Record<string, Entry<unknown>>) {
  try {
    const dir = path.dirname(CACHE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify(store, null, 2));
  } catch {}
}

function get<T>(key: string): T | undefined {
  // Check memory first
  const mem = memory.get(key) as Entry<T> | undefined;
  if (mem && mem.expiresAt > Date.now()) return mem.value;

  // Fall back to disk
  const disk = loadFile();
  const entry = disk[key] as Entry<T> | undefined;
  if (entry && entry.expiresAt > Date.now()) {
    memory.set(key, entry); // warm memory cache
    return entry.value;
  }
  return undefined;
}

function set<T>(key: string, value: T, ttlMs: number) {
  const entry: Entry<T> = { value, expiresAt: Date.now() + ttlMs };
  memory.set(key, entry as Entry<unknown>);

  // Persist to disk (only cache non-expired entries)
  const disk = loadFile();
  const now = Date.now();
  // Prune expired entries
  for (const k of Object.keys(disk)) {
    if (disk[k].expiresAt <= now) delete disk[k];
  }
  disk[key] = entry as Entry<unknown>;
  saveFile(disk);
}

// Only caches non-null results — null signals a transient failure (rate limit, network)
export async function cached<T>(
  key: string,
  ttlMs: number,
  fn: () => Promise<T | null>,
): Promise<T | null> {
  const hit = get<T>(key);
  if (hit !== undefined) return hit;

  const value = await fn();
  if (value !== null) set(key, value, ttlMs);
  return value;
}
