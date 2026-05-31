import { type NextRequest, NextResponse } from 'next/server';
import { aggregateUsage } from '@/lib/aggregate';
import { generateBarChart } from '@/lib/barchart';
import type { Theme } from '@/lib/types';

export const dynamic   = 'force-dynamic';
export const revalidate = 3600;

export async function GET(request: NextRequest) {
  const sp    = request.nextUrl.searchParams;
  const theme = (sp.get('theme') ?? process.env.DEFAULT_THEME ?? 'dark') as Theme;
  const days  = Math.min(parseInt(sp.get('days') ?? '30', 10), 90);

  // Always fetch 365 days so this shares a cache entry with the heatmap route
  const result = await aggregateUsage(365);
  const svg    = generateBarChart(result.days, theme, days, result.estimatedCostTotal);

  return new NextResponse(svg, {
    headers: {
      'Content-Type':  'image/svg+xml',
      'Cache-Control': 'no-store',
    },
  });
}
