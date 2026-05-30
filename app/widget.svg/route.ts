import { type NextRequest, NextResponse } from 'next/server';
import { aggregateUsage } from '@/lib/aggregate';
import { generateSVG } from '@/lib/svg';
import type { ColorScheme, Theme, Source } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const source = (sp.get('source') ?? 'all') as Source;
  const theme  = (sp.get('theme')  ?? process.env.DEFAULT_THEME         ?? 'dark')   as Theme;
  const color  = (sp.get('color')  ?? process.env.DEFAULT_COLOR_SCHEME  ?? 'purple') as ColorScheme;

  const data = await aggregateUsage(365);
  const svg  = generateSVG(data, theme, color, source);

  return new NextResponse(svg, {
    headers: {
      'Content-Type':  'image/svg+xml',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
