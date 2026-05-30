import { fetchAnthropicUsage } from './anthropic';
import { fetchOpenAIUsage } from './openai';
import { getManualTokensByDate } from './manual';
import type { UsageDay } from './types';

export interface ModelUsage { tokens: number; cost: number; }

export interface AggregateResult {
  days: UsageDay[];
  estimatedCostAnthropic: number;
  estimatedCostOpenAI: number;
  estimatedCostTotal: number;
  currentStreak: number;
  longestStreak: number;
  byModel: Record<string, ModelUsage & { source: 'anthropic' | 'openai' }>;
}

function computeStreaks(days: UsageDay[]): { currentStreak: number; longestStreak: number } {
  const todayStr = new Date().toISOString().split('T')[0];
  const activeDates = new Set(days.filter(d => d.total > 0).map(d => d.date));

  // Current streak: count backwards from today
  let currentStreak = 0;
  const cursor = new Date();
  // If today has no activity yet, start from yesterday
  if (!activeDates.has(todayStr)) cursor.setDate(cursor.getDate() - 1);
  while (activeDates.has(cursor.toISOString().split('T')[0])) {
    currentStreak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  // Longest streak: scan all days in order
  let longest = 0, run = 0;
  for (const day of days) {
    if (day.total > 0) { run++; longest = Math.max(longest, run); }
    else run = 0;
  }

  return { currentStreak, longestStreak: longest };
}

export function getDateRange(days = 365): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
  };
}

function getAllDates(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const current = new Date(startDate);
  const end = new Date(endDate);
  while (current <= end) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

export async function aggregateUsage(days = 365): Promise<AggregateResult> {
  const { startDate, endDate } = getDateRange(days);

  const [anthropicRaw, openaiRaw, manual] = await Promise.all([
    fetchAnthropicUsage(startDate, endDate),
    fetchOpenAIUsage(startDate, endDate),
    Promise.resolve(getManualTokensByDate()),
  ]);

  const anthropic = anthropicRaw?.byDate ?? {};
  const openai    = openaiRaw?.byDate    ?? {};
  const estimatedCostAnthropic = anthropicRaw?.estimatedCost ?? 0;
  const estimatedCostOpenAI    = openaiRaw?.estimatedCost    ?? 0;

  const days_ = getAllDates(startDate, endDate).map(date => ({
    date,
    anthropic: anthropic[date] ?? 0,
    openai:    openai[date]    ?? 0,
    manual:    manual[date]    ?? 0,
    total: (anthropic[date] ?? 0) + (openai[date] ?? 0) + (manual[date] ?? 0),
  }));

  const { currentStreak, longestStreak } = computeStreaks(days_);

  const byModel: AggregateResult['byModel'] = {};
  for (const [model, usage] of Object.entries(anthropicRaw?.byModel ?? {})) {
    byModel[model] = { ...usage, source: 'anthropic' };
  }
  for (const [model, usage] of Object.entries(openaiRaw?.byModel ?? {})) {
    byModel[model] = { ...usage, source: 'openai' };
  }

  return {
    days: days_,
    estimatedCostAnthropic,
    estimatedCostOpenAI,
    estimatedCostTotal: estimatedCostAnthropic + estimatedCostOpenAI,
    currentStreak,
    longestStreak,
    byModel,
  };
}
