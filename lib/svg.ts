import type { UsageDay, ColorScheme, Theme, Source } from './types';
import { fmtCost } from './pricing';

// Source-specific palettes (level 0 = empty cell background)
const PALETTE = {
  dark: {
    bg:        '#0d1117',
    empty:     '#161b22',
    text:      '#8b949e',
    anthropic: ['#161b22', '#7c2d12', '#c2410c', '#f97316', '#fdba74'],
    openai:    ['#161b22', '#0c4a6e', '#0369a1', '#38bdf8', '#bae6fd'],
    manual:    ['#161b22', '#4a1d96', '#7c3aed', '#a78bfa', '#c4b5fd'],
  },
  light: {
    bg:        '#ffffff',
    empty:     '#ebedf0',
    text:      '#57606a',
    anthropic: ['#ebedf0', '#fed7aa', '#fb923c', '#ea580c', '#9a3412'],
    openai:    ['#ebedf0', '#bae6fd', '#38bdf8', '#0369a1', '#0c4a6e'],
    manual:    ['#ebedf0', '#ddd6fe', '#a78bfa', '#7c3aed', '#5b21b6'],
  },
};

// Single-color fallback palettes (used when source filter is set)
const SINGLE: Record<Theme, Record<ColorScheme, string[]>> = {
  light: {
    purple: ['#ebedf0', '#ddd6fe', '#a78bfa', '#7c3aed', '#5b21b6'],
    green:  ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'],
    orange: ['#ebedf0', '#fed7aa', '#fb923c', '#ea580c', '#9a3412'],
    blue:   ['#ebedf0', '#bfdbfe', '#60a5fa', '#2563eb', '#1e3a8a'],
  },
  dark: {
    purple: ['#161b22', '#4a1d96', '#7c3aed', '#a78bfa', '#c4b5fd'],
    green:  ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353'],
    orange: ['#161b22', '#7c2d12', '#c2410c', '#f97316', '#fdba74'],
    blue:   ['#161b22', '#1e3a8a', '#1d4ed8', '#3b82f6', '#93c5fd'],
  },
};

const CELL   = 11;
const GAP    = 2;
const STEP   = CELL + GAP;
const WEEKS  = 53;
const DAYS   = 7;
const MONTH_TOP     = 20;
const PAD_LEFT      = 28;
const PAD_RIGHT     = 40;
const LEGEND_HEIGHT = 38;

const W = PAD_LEFT + WEEKS * STEP + PAD_RIGHT;
const H = MONTH_TOP + DAYS * STEP + LEGEND_HEIGHT;

const MONTHS   = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const WEEKDAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function lvl(tokens: number, max: number): number {
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
  estimatedCost = 0,
  currentStreak = 0,
): string {
  const P = PALETTE[theme];

  // Index data by date per source
  const byA: Record<string, number> = {};
  const byO: Record<string, number> = {};
  const byM: Record<string, number> = {};
  for (const d of data) {
    if (d.anthropic > 0) byA[d.date] = d.anthropic;
    if (d.openai    > 0) byO[d.date] = d.openai;
    if (d.manual    > 0) byM[d.date] = d.manual;
  }

  const maxA = Math.max(...Object.values(byA), 1);
  const maxO = Math.max(...Object.values(byO), 1);
  const maxM = Math.max(...Object.values(byM), 1);

  // For single-source view, use the combined max
  const singlePalette = SINGLE[theme][color];
  const singleByDate: Record<string, number> = {};
  if (source !== 'all') {
    const raw = source === 'anthropic' ? byA : source === 'openai' ? byO : byM;
    Object.assign(singleByDate, raw);
  }
  const singleMax = Math.max(...Object.values(singleByDate), 1);

  // Build 53-week grid anchored to the most recent Sunday
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const gridStart = new Date(today);
  gridStart.setDate(gridStart.getDate() - 52 * 7);
  gridStart.setDate(gridStart.getDate() - gridStart.getDay());

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

  // Weekday labels (Mon, Wed, Fri — indices 1, 3, 5)
  const dayLabels = [1, 3, 5].map(d =>
    `<text x="${PAD_LEFT - 4}" y="${MONTH_TOP + d * STEP + CELL - 1}" font-size="9" fill="${P.text}" font-family="system-ui,sans-serif" text-anchor="end">${WEEKDAYS[d]}</text>`
  ).join('');

  // Month labels
  let lastMonth = -1;
  const monthSVG = weeks.map((week, w) => {
    const first = week.find(d => d !== null);
    if (!first) return '';
    const m = new Date(first).getMonth();
    if (m === lastMonth) return '';
    lastMonth = m;
    return `<text x="${PAD_LEFT + w * STEP}" y="${MONTH_TOP - 5}" font-size="9" fill="${P.text}" font-family="system-ui,sans-serif">${MONTHS[m]}</text>`;
  }).join('');

  // Cells + defs (clipPaths for mixed cells)
  const defs: string[] = [];
  const cells: string[] = [];

  for (let w = 0; w < WEEKS; w++) {
    for (let d = 0; d < DAYS; d++) {
      const date = weeks[w][d];
      if (!date) continue;

      const x = PAD_LEFT + w * STEP;
      const y = MONTH_TOP + d * STEP;

      if (source !== 'all') {
        // Single-source view
        const t = singleByDate[date] ?? 0;
        const fill = singlePalette[lvl(t, singleMax)];
        const tip = `${date}: ${t.toLocaleString()} tokens`;
        cells.push(`<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="2" fill="${fill}"><title>${tip}</title></rect>`);
        continue;
      }

      // All-sources view
      const aT = byA[date] ?? 0;
      const oT = byO[date] ?? 0;
      const mT = byM[date] ?? 0;
      const hasA = aT > 0, hasO = oT > 0, hasM = mT > 0;

      if (!hasA && !hasO && !hasM) {
        cells.push(`<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="2" fill="${P.empty}"/>`);
        continue;
      }

      const tip = [
        hasA ? `Anthropic: ${aT.toLocaleString()}` : '',
        hasO ? `OpenAI: ${oT.toLocaleString()}`    : '',
        hasM ? `Manual: ${mT.toLocaleString()}`    : '',
      ].filter(Boolean).join(' | ');

      if (hasA && hasO) {
        // Diagonal split: Anthropic top-left, OpenAI bottom-right
        const clipId = `c${w}x${d}`;
        defs.push(`<clipPath id="${clipId}"><rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="2"/></clipPath>`);
        const aC = P.anthropic[lvl(aT, maxA)];
        const oC = P.openai[lvl(oT, maxO)];
        cells.push(
          `<g clip-path="url(#${clipId})">` +
          `<polygon points="${x},${y} ${x+CELL},${y} ${x},${y+CELL}" fill="${aC}"/>` +
          `<polygon points="${x+CELL},${y} ${x+CELL},${y+CELL} ${x},${y+CELL}" fill="${oC}"/>` +
          `<title>${date}: ${tip}</title></g>`
        );
      } else if (hasA) {
        const fill = P.anthropic[lvl(aT, maxA)];
        cells.push(`<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="2" fill="${fill}"><title>${date}: ${tip}</title></rect>`);
      } else if (hasO) {
        const fill = P.openai[lvl(oT, maxO)];
        cells.push(`<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="2" fill="${fill}"><title>${date}: ${tip}</title></rect>`);
      } else {
        const fill = P.manual[lvl(mT, maxM)];
        cells.push(`<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="2" fill="${fill}"><title>${date}: ${tip}</title></rect>`);
      }
    }
  }

  // Legend
  const ly = MONTH_TOP + DAYS * STEP + 10;
  const legendItems = source === 'all'
    ? buildAllLegend(P, ly, theme)
    : buildSingleLegend(singlePalette, ly, P.text);

  const metaY = MONTH_TOP + DAYS * STEP + 10 + CELL - 1;
  const metaParts: string[] = [];
  if (currentStreak > 0)  metaParts.push(`🔥 ${currentStreak}`);
  if (estimatedCost > 0)  metaParts.push(`~${fmtCost(estimatedCost)}`);
  const metaSVG = metaParts.length > 0
    ? `<text x="${W - PAD_RIGHT + 4}" y="${metaY}" font-size="9" fill="${P.text}" font-family="system-ui,sans-serif" text-anchor="start">${metaParts.join('  ')}</text>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" rx="6" fill="${P.bg}"/>
  ${defs.length ? `<defs>${defs.join('')}</defs>` : ''}
  ${dayLabels}
  ${monthSVG}
  ${cells.join('\n  ')}
  ${legendItems}
  ${metaSVG}
</svg>`;
}

function buildAllLegend(P: typeof PALETTE['dark'], ly: number, theme: Theme): string {
  const tx = P.text;
  const items: string[] = [];
  let x = 0;

  // Anthropic swatch
  items.push(`<rect x="${x}" y="${ly}" width="${CELL}" height="${CELL}" rx="2" fill="${P.anthropic[3]}"/>`);
  x += CELL + 4;
  items.push(`<text x="${x}" y="${ly + CELL - 1}" font-size="9" fill="${tx}" font-family="system-ui,sans-serif">Anthropic</text>`);
  x += 54;

  // OpenAI swatch
  items.push(`<rect x="${x}" y="${ly}" width="${CELL}" height="${CELL}" rx="2" fill="${P.openai[3]}"/>`);
  x += CELL + 4;
  items.push(`<text x="${x}" y="${ly + CELL - 1}" font-size="9" fill="${tx}" font-family="system-ui,sans-serif">OpenAI</text>`);
  x += 44;

  // Manual swatch
  items.push(`<rect x="${x}" y="${ly}" width="${CELL}" height="${CELL}" rx="2" fill="${P.manual[3]}"/>`);
  x += CELL + 4;
  items.push(`<text x="${x}" y="${ly + CELL - 1}" font-size="9" fill="${tx}" font-family="system-ui,sans-serif">Manual</text>`);
  x += 46;

  // Mixed swatch (diagonal)
  const mixId = 'leg-mix';
  const mx = x;
  const mixDef = `<defs><clipPath id="${mixId}"><rect x="${mx}" y="${ly}" width="${CELL}" height="${CELL}" rx="2"/></clipPath></defs>`;
  items.push(mixDef);
  items.push(
    `<g clip-path="url(#${mixId})">` +
    `<polygon points="${mx},${ly} ${mx+CELL},${ly} ${mx},${ly+CELL}" fill="${P.anthropic[3]}"/>` +
    `<polygon points="${mx+CELL},${ly} ${mx+CELL},${ly+CELL} ${mx},${ly+CELL}" fill="${P.openai[3]}"/>` +
    `</g>`
  );
  x += CELL + 4;
  items.push(`<text x="${x}" y="${ly + CELL - 1}" font-size="9" fill="${tx}" font-family="system-ui,sans-serif">Both</text>`);

  return items.join('');
}

function buildSingleLegend(palette: string[], ly: number, textColor: string): string {
  const items: string[] = [];
  const lx = 0;
  items.push(`<text x="${lx}" y="${ly + CELL - 1}" font-size="9" fill="${textColor}" font-family="system-ui,sans-serif">Less</text>`);
  let x = 28;
  for (const c of palette) {
    items.push(`<rect x="${x}" y="${ly}" width="${CELL}" height="${CELL}" rx="2" fill="${c}"/>`);
    x += CELL + 3;
  }
  items.push(`<text x="${x + 2}" y="${ly + CELL - 1}" font-size="9" fill="${textColor}" font-family="system-ui,sans-serif">More</text>`);
  return items.join('');
}
