import { type NextRequest, NextResponse } from 'next/server';
import { aggregateUsage } from '@/lib/aggregate';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const days = Math.min(
    parseInt(request.nextUrl.searchParams.get('days') ?? '365', 10),
    365,
  );
  const data = await aggregateUsage(days);
  return NextResponse.json({ data });
}
