import { type NextRequest, NextResponse } from 'next/server';
import { addSession, readSessions } from '@/lib/manual';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ sessions: readSessions() });
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { date, tokens_estimated, source = 'claude.ai', note } = body;

  if (!date || !tokens_estimated) {
    return NextResponse.json({ error: 'date and tokens_estimated are required' }, { status: 400 });
  }
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'date must be YYYY-MM-DD' }, { status: 400 });
  }

  const session = addSession({
    date,
    tokens_estimated: Number(tokens_estimated),
    source: (source as 'claude.ai' | 'chatgpt' | 'other') ?? 'claude.ai',
    note: note as string | undefined,
  });

  return NextResponse.json({ session }, { status: 201 });
}
