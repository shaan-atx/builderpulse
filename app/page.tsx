import { aggregateUsage } from '@/lib/aggregate';
import { fmtCost } from '@/lib/pricing';

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export default async function PublicProfile() {
  const result = await aggregateUsage(365);
  const { days, currentStreak, longestStreak } = result;

  const totalTokens     = days.reduce((s, d) => s + d.total, 0);
  const anthropicTokens = days.reduce((s, d) => s + d.anthropic, 0);
  const openaiTokens    = days.reduce((s, d) => s + d.openai, 0);
  const activeDays      = days.filter(d => d.total > 0).length;

  const badges: { icon: string; label: string; color: string }[] = [];
  if (totalTokens >= 10_000_000) badges.push({ icon: '🏆', label: '10M Club',       color: 'text-yellow-400 border-yellow-700 bg-yellow-950' });
  else if (totalTokens >= 1_000_000) badges.push({ icon: '💎', label: '1M Club',    color: 'text-purple-400 border-purple-700 bg-purple-950' });
  else if (totalTokens >= 100_000)   badges.push({ icon: '🔥', label: '100K Builder', color: 'text-orange-400 border-orange-700 bg-orange-950' });
  else if (totalTokens >= 10_000)    badges.push({ icon: '⚡', label: '10K Builder',  color: 'text-blue-400 border-blue-700 bg-blue-950' });
  if (longestStreak >= 30) badges.push({ icon: '📅', label: '30-Day Streak', color: 'text-pink-400 border-pink-700 bg-pink-950' });
  else if (longestStreak >= 7) badges.push({ icon: '📅', label: '7-Day Streak', color: 'text-cyan-400 border-cyan-700 bg-cyan-950' });
  if (activeDays >= 100) badges.push({ icon: '🗓️', label: '100 Active Days', color: 'text-indigo-400 border-indigo-700 bg-indigo-950' });

  return (
    <div className="max-w-3xl mx-auto px-6 py-12 space-y-10">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-3xl font-bold text-white">BuilderPulse</h1>
        <p className="text-gray-400">AI API activity — last 52 weeks</p>
      </div>

      {/* Heatmap */}
      <div className="rounded-lg overflow-hidden border border-gray-800">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/widget.svg" alt="AI activity heatmap" className="w-full" />
      </div>

      {/* Bar chart */}
      <div className="rounded-lg overflow-hidden border border-gray-800">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/barchart.svg" alt="30-day activity" className="w-full" />
      </div>

      {/* Streak */}
      {(currentStreak > 0 || longestStreak > 0) && (
        <div className="flex gap-4">
          <div className="flex-1 bg-[#161b22] border border-gray-800 rounded-lg p-5 text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Current streak</p>
            <p className="text-3xl font-bold text-orange-400">{currentStreak > 0 ? `🔥 ${currentStreak}` : '—'}</p>
            <p className="text-xs text-gray-600 mt-1">days</p>
          </div>
          <div className="flex-1 bg-[#161b22] border border-gray-800 rounded-lg p-5 text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Longest streak</p>
            <p className="text-3xl font-bold text-yellow-400">{longestStreak}</p>
            <p className="text-xs text-gray-600 mt-1">days</p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total tokens', value: fmt(totalTokens),     color: 'text-purple-400' },
          { label: 'Active days',  value: String(activeDays),   color: 'text-blue-400'   },
          { label: 'Anthropic',    value: fmt(anthropicTokens), color: 'text-orange-400' },
          { label: 'OpenAI',       value: fmt(openaiTokens),    color: 'text-cyan-400'   },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-[#161b22] border border-gray-800 rounded-lg p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Badges */}
      {badges.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {badges.map(({ icon, label, color }) => (
            <span key={label} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium ${color}`}>
              {icon} {label}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-800">
        <p className="text-xs text-gray-600">
          ~{fmtCost(result.estimatedCostTotal)} estimated API spend · last 365 days
        </p>
        <a href="/dashboard" className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
          Dashboard →
        </a>
      </div>
    </div>
  );
}
