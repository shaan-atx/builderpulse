import type { UsageDay, Theme } from './types';
import { fmtCost } from './pricing';

const PAL = {
  dark:  { bg: '#0d1117', empty: '#21262d', text: '#8b949e', anthropic: '#f97316', openai: '#38bdf8', gridLine: '#21262d' },
  light: { bg: '#ffffff', empty: '#ebedf0', text: '#57606a', anthropic: '#ea580c', openai: '#0369a1', gridLine: '#e5e7eb' },
};

export function generateBarChart(
  data: UsageDay[],
  theme: Theme = 'dark',
  days = 30,
  estimatedCost = 0,
): string {
  const P = PAL[theme];
  const slice = data.slice(-days);

  const maxTotal = Math.max(...slice.map(d => d.total), 1);

  const BAR_W     = 12;
  const BAR_GAP   = 3;
  const COL       = BAR_W + BAR_GAP;
  const PAD_LEFT  = 42;
  const PAD_RIGHT = 16;
  const PAD_TOP   = 20;
  const PAD_BOT   = 36;
  const CHART_H   = 80;
  const W = PAD_LEFT + days * COL - BAR_GAP + PAD_RIGHT;
  const H = PAD_TOP + CHART_H + PAD_BOT;

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  // Y-axis labels (3 lines: 0, mid, max)
  function fmtY(n: number) {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`;
    return String(n);
  }

  const yLabels = [0, maxTotal * 0.5, maxTotal].map((v, i) => {
    const y = PAD_TOP + CHART_H - (v / maxTotal) * CHART_H;
    return `<text x="${PAD_LEFT - 4}" y="${y + 3}" font-size="8" fill="${P.text}" font-family="system-ui,sans-serif" text-anchor="end">${fmtY(v)}</text>
<line x1="${PAD_LEFT}" y1="${y}" x2="${W - PAD_RIGHT}" y2="${y}" stroke="${P.gridLine}" stroke-width="0.5" stroke-dasharray="${i > 0 ? '2,2' : ''}"/>`;
  }).join('');

  // Bars
  const bars: string[] = [];
  const monthLabels: string[] = [];
  let lastMonth = -1;

  slice.forEach((day, i) => {
    const x     = PAD_LEFT + i * COL;
    const aH    = day.total > 0 ? Math.max((day.anthropic / maxTotal) * CHART_H, 1) : 0;
    const oH    = day.total > 0 ? Math.max((day.openai    / maxTotal) * CHART_H, 1) : 0;
    const totalH = (day.total / maxTotal) * CHART_H;
    const baseY = PAD_TOP + CHART_H;

    if (day.total === 0) {
      bars.push(`<rect x="${x}" y="${baseY - 2}" width="${BAR_W}" height="2" rx="1" fill="${P.empty}"/>`);
    } else if (day.anthropic > 0 && day.openai > 0) {
      // Stacked: OpenAI on bottom, Anthropic on top
      const oBarH = Math.round((day.openai    / day.total) * totalH);
      const aBarH = Math.round((day.anthropic / day.total) * totalH);
      bars.push(`<rect x="${x}" y="${baseY - oBarH}" width="${BAR_W}" height="${oBarH}" fill="${P.openai}" rx="0"/>`);
      bars.push(`<rect x="${x}" y="${baseY - oBarH - aBarH}" width="${BAR_W}" height="${aBarH}" rx="1" fill="${P.anthropic}"/>`);
    } else if (day.anthropic > 0) {
      bars.push(`<rect x="${x}" y="${baseY - aH}" width="${BAR_W}" height="${aH}" rx="1" fill="${P.anthropic}"/>`);
    } else {
      bars.push(`<rect x="${x}" y="${baseY - oH}" width="${BAR_W}" height="${oH}" rx="1" fill="${P.openai}"/>`);
    }

    // Month label on transition
    const m = new Date(day.date).getMonth();
    if (m !== lastMonth) {
      monthLabels.push(`<text x="${x}" y="${H - PAD_BOT + 14}" font-size="8" fill="${P.text}" font-family="system-ui,sans-serif">${MONTHS[m]}</text>`);
      lastMonth = m;
    }
  });

  // Legend + cost
  const ly = H - 14;
  const legend = [
    `<rect x="${PAD_LEFT}" y="${ly - 7}" width="8" height="8" rx="1" fill="${P.anthropic}"/>`,
    `<text x="${PAD_LEFT + 10}" y="${ly}" font-size="8" fill="${P.text}" font-family="system-ui,sans-serif">Anthropic</text>`,
    `<rect x="${PAD_LEFT + 64}" y="${ly - 7}" width="8" height="8" rx="1" fill="${P.openai}"/>`,
    `<text x="${PAD_LEFT + 76}" y="${ly}" font-size="8" fill="${P.text}" font-family="system-ui,sans-serif">OpenAI</text>`,
    estimatedCost > 0
      ? `<text x="${W - PAD_RIGHT}" y="${ly}" font-size="8" fill="${P.text}" font-family="system-ui,sans-serif" text-anchor="end">~${fmtCost(estimatedCost)}</text>`
      : '',
  ].join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" rx="6" fill="${P.bg}"/>
  ${yLabels}
  ${bars.join('\n  ')}
  ${monthLabels.join('\n  ')}
  ${legend}
</svg>`;
}
