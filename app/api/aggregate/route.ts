import { type NextRequest, NextResponse } from 'next/server';
import { aggregateUsage } from '@/lib/aggregate';

export const dynamic   = 'force-dynamic';
export const revalidate = 3600;

export async function GET(request: NextRequest) {
  const days = Math.min(
    parseInt(request.nextUrl.searchParams.get('days') ?? '365', 10),
    365,
  );
  const result = await aggregateUsage(days);
  return NextResponse.json({
    data: result.days,
    estimatedCost: {
      anthropic: result.estimatedCostAnthropic,
      openai:    result.estimatedCostOpenAI,
      total:     result.estimatedCostTotal,
    },
  });
}
