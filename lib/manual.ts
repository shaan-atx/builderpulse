import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { ManualSession } from './types';

const DATA_FILE = path.join(process.cwd(), 'data', 'manual.json');

function ensureDataDir() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export function readSessions(): ManualSession[] {
  try {
    ensureDataDir();
    if (!fs.existsSync(DATA_FILE)) return [];
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8')) as ManualSession[];
  } catch {
    return [];
  }
}

function writeSessions(sessions: ManualSession[]): void {
  ensureDataDir();
  fs.writeFileSync(DATA_FILE, JSON.stringify(sessions, null, 2));
}

export function addSession(
  data: Omit<ManualSession, 'id' | 'created_at'>,
): ManualSession {
  const sessions = readSessions();
  const session: ManualSession = {
    ...data,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
  };
  sessions.push(session);
  writeSessions(sessions);
  return session;
}

export function getManualTokensByDate(): Record<string, number> {
  const sessions = readSessions();
  const result: Record<string, number> = {};
  for (const s of sessions) {
    result[s.date] = (result[s.date] ?? 0) + s.tokens_estimated;
  }
  return result;
}
