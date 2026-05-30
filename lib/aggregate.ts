import { fetchAnthropicUsage } from './anthropic';
import { fetchOpenAIUsage } from './openai';
import { getManualTokensByDate } from './manual';
import type { UsageDay } from './types';

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

export async function aggregateUsage(days = 365): Promise<UsageDay[]> {
  const { startDate, endDate } = getDateRange(days);

  const [anthropicRaw, openaiRaw, manual] = await Promise.all([
    fetchAnthropicUsage(startDate, endDate),
    fetchOpenAIUsage(startDate, endDate),
    Promise.resolve(getManualTokensByDate()),
  ]);

  const anthropic = anthropicRaw ?? {};
  const openai    = openaiRaw    ?? {};

  return getAllDates(startDate, endDate).map(date => ({
    date,
    anthropic: anthropic[date] ?? 0,
    openai:    openai[date]    ?? 0,
    manual:    manual[date]    ?? 0,
    total: (anthropic[date] ?? 0) + (openai[date] ?? 0) + (manual[date] ?? 0),
  }));
}
