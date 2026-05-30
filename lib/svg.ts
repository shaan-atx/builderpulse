import type { UsageDay, ColorScheme, Theme, Source } from './types';

const COLORS: Record<Theme, Record<ColorScheme, string[]>> = {
  light: {
    purple: ['#ebedf0', '#ddd6fe', '#a78bfa', '#7c3aed', '#5b21b6'],
    green:  ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'],
    orange: ['#ebedf0', '#fde68a', '#fbbf24', '#d97706', '#92400e'],
    blue:   ['#ebedf0', '#bfdbfe', '#60a5fa', '#2563eb', '#1e3a8a'],
  },
  dark: {
    purple: ['#161b22', '#4a1d96', '#7c3aed', '#a78bfa', '#c4b5fd'],
    green:  ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353'],
    orange: ['#161b22', '#78350f', '#92400e', '#d97706', '#fbbf24'],
    blue:   ['#161b22', '#1e3a8a', '#1d4ed8', '#3b82f6', '#93c5fd'],
  },
};

const CELL = 11;
const GAP = 2;
const STEP = CELL + GAP;
const WEEKS = 53;
const DAYS = 7;
const MONTH_TOP = 20;
const PAD_RIGHT = 10;
const LEGEND_HEIGHT = 28;

const W = WEEKS * STEP + PAD_RIGHT;
const H = MONTH_TOP + DAYS * STEP + LEGEND_HEIGHT;

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function level(tokens: number, max: number): number {
  if (tokens === 0 || max === 0) return 0;
  if (tokens < max * 0.25) return 1;
  if (tokens < max * 0.5)  return 2;
  if (tokens < max * 0.75) return 3;
  return 4;
}

export function generateSVG(
  data: UsageDay[],
  theme: Theme = 'dark',
  color: ColorScheme = 'purple',
  source: Source = 'all',
): string {
  const palette = COLORS[theme][color];
  const bg        = theme === 'dark' ? '#0d1117' : '#ffffff';
  const textColor = theme === 'dark' ? '#8b949e' : '#57606a';

  const byDate: Record<string, number> = {};
  for (const day of data) {
    byDate[day.date] =
      source === 'anthropic' ? day.anthropic :
      source === 'openai'    ? day.openai    :
      source === 'manual'    ? day.manual    :
      day.total;
  }

  // Build grid: start from the Sunday 52 weeks before today
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const gridStart = new Date(today);
  gridStart.setDate(gridStart.getDate() - 52 * 7);
  gridStart.setDate(gridStart.getDate() - gridStart.getDay()); // snap to Sunday

  const weeks: (string | null)[][] = [];
  const cur = new Date(gridStart);
  for (let w = 0; w < WEEKS; w++) {
    const week: (string | null)[] = [];
    for (let d = 0; d < DAYS; d++) {
      week.push(cur <= today ? cur.toISOString().split('T')[0] : null);
      cur.setDate(cur.getDate() + 1);
    }
    weeks.push(week);
  }

  const max = Math.max(...Object.values(byDate), 1);

  // Month labels
  let lastMonth = -1;
  const monthSVG = weeks.map((week, w) => {
    const first = week.find(d => d !== null);
    if (!first) return '';
    const m = new Date(first).getMonth();
    if (m === lastMonth) return '';
    lastMonth = m;
    return `<text x="${w * STEP}" y="${MONTH_TOP - 5}" font-size="9" fill="${textColor}" font-family="system-ui,sans-serif">${MONTHS[m]}</text>`;
  }).join('');

  // Cells
  const cellSVG = weeks.flatMap((week, w) =>
    week.map((date, d) => {
      if (!date) return '';
      const x = w * STEP;
      const y = MONTH_TOP + d * STEP;
      const t = byDate[date] ?? 0;
      const fill = palette[level(t, max)];
      return `<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="2" fill="${fill}"><title>${date}: ${t.toLocaleString()} tokens</title></rect>`;
    })
  ).join('');

  // Legend
  const lx = W - PAD_RIGHT - 5 * (CELL + 3) - 32;
  const ly = MONTH_TOP + DAYS * STEP + 8;
  const legendBoxes = palette.map((c, i) =>
    `<rect x="${lx + 30 + i * (CELL + 3)}" y="${ly}" width="${CELL}" height="${CELL}" rx="2" fill="${c}"/>`
  ).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" rx="6" fill="${bg}"/>
  ${monthSVG}
  ${cellSVG}
  <text x="${lx}" y="${ly + CELL - 1}" font-size="9" fill="${textColor}" font-family="system-ui,sans-serif">Less</text>
  ${legendBoxes}
  <text x="${lx + 30 + 5 * (CELL + 3) + 2}" y="${ly + CELL - 1}" font-size="9" fill="${textColor}" font-family="system-ui,sans-serif">More</text>
</svg>`;
}
