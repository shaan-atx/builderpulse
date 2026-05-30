'use server';

import { addSession } from '@/lib/manual';
import type { ManualSession } from '@/lib/types';

export async function logSession(
  data: Omit<ManualSession, 'id' | 'created_at'>,
): Promise<{ ok: true; session: ManualSession } | { ok: false; error: string }> {
  if (!process.env.MANUAL_LOG_SECRET) {
    return { ok: false, error: 'MANUAL_LOG_SECRET not configured' };
  }
  try {
    const session = addSession(data);
    return { ok: true, session };
  } catch {
    return { ok: false, error: 'Failed to save session' };
  }
}
