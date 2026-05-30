import { aggregateUsage } from '@/lib/aggregate';
import { readSessions } from '@/lib/manual';
import { fmtCost } from '@/lib/pricing';
import LogForm from './LogForm';

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function SetupBanner() {
  const missing: { label: string; envVar: string; link: string; note: string }[] = [];

  if (!process.env.ANTHROPIC_API_KEY)
    missing.push({ label: 'Anthropic Admin Key', envVar: 'ANTHROPIC_API_KEY', link: 'https://console.anthropic.com/settings/api-keys', note: 'Create an Admin key (sk-ant-admin-...)' });
  if (!process.env.OPENAI_API_KEY)
    missing.push({ label: 'OpenAI Usage Key', envVar: 'OPENAI_API_KEY', link: 'https://platform.openai.com/api-keys', note: 'Create a Restricted key with Usage → Read scope' });
  if (!process.env.MANUAL_LOG_SECRET)
    missing.push({ label: 'Manual Log Secret', envVar: 'MANUAL_LOG_SECRET', link: '', note: 'Any random string — used to protect the manual log API' });

  if (missing.length === 0) return null;

  return (
    <div className="bg-yellow-950 border border-yellow-700 rounded-lg p-5 space-y-3">
      <p className="text-yellow-300 font-semibold text-sm">⚙️ Setup required — {missing.length} environment variable{missing.length > 1 ? 's' : ''} missing</p>
      <div className="space-y-2">
        {missing.map(({ label, envVar, link, note }) => (
          <div key={envVar} className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <span className="text-yellow-400 text-sm font-medium">{label}</span>
              <code className="text-yellow-600 text-xs bg-yellow-950 px-1 rounded">{envVar}</code>
              {link && <a href={link} target="_blank" rel="noopener noreferrer" className="text-yellow-500 text-xs underline">Get key →</a>}
            </div>
            <p className="text-yellow-700 text-xs">{note}</p>
          </div>
        ))}
      </div>
      <p className="text-yellow-700 text-xs">Add these to your <code className="bg-yellow-950 px-1 rounded">.env.local</code> file locally, or to your Vercel project environment variables when deploying.</p>
    </div>
  );
}

function Badges({ totalTokens, currentStreak, longestStreak, activeDays }: {
  totalTokens: number; currentStreak: number; longestStreak: number; activeDays: number;
}) {
  const earned: { icon: string; label: string; color: string }[] = [];

  // Token milestones
  if (totalTokens >= 10_000_000) earned.push({ icon: '🏆', label: '10M Club',    color: 'text-yellow-400 border-yellow-700 bg-yellow-950' });
  else if (totalTokens >= 1_000_000) earned.push({ icon: '💎', label: '1M Club',  color: 'text-purple-400 border-purple-700 bg-purple-950' });
  else if (totalTokens >= 100_000)   earned.push({ icon: '🔥', label: '100K Builder', color: 'text-orange-400 border-orange-700 bg-orange-950' });
  else if (totalTokens >= 10_000)    earned.push({ icon: '⚡', label: '10K Builder',  color: 'text-blue-400 border-blue-700 bg-blue-950' });
  else if (totalTokens >= 1_000)     earned.push({ icon: '🌱', label: '1K Builder',   color: 'text-green-400 border-green-700 bg-green-950' });

  // Streak milestones
  if (longestStreak >= 30)  earned.push({ icon: '📅', label: '30-Day Streak', color: 'text-pink-400 border-pink-700 bg-pink-950' });
  else if (longestStreak >= 7) earned.push({ icon: '📅', label: '7-Day Streak', color: 'text-cyan-400 border-cyan-700 bg-cyan-950' });

  // Active days
  if (activeDays >= 100) earned.push({ icon: '🗓️', label: '100 Active Days', color: 'text-indigo-400 border-indigo-700 bg-indigo-950' });
  else if (activeDays >= 30) earned.push({ icon: '🗓️', label: '30 Active Days', color: 'text-teal-400 border-teal-700 bg-teal-950' });

  if (earned.length === 0) return null;

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Badges</h2>
      <div className="flex flex-wrap gap-2">
        {earned.map(({ icon, label, color }) => (
          <span key={label} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium ${color}`}>
            {icon} {label}
          </span>
        ))}
      </div>
    </div>
  );
}

export default async function Dashboard() {
  const result   = await aggregateUsage(365);
  const { days, currentStreak, longestStreak, byModel } = result;
  const sessions = readSessions();

  const totalTokens     = days.reduce((s, d) => s + d.total, 0);
  const anthropicTokens = days.reduce((s, d) => s + d.anthropic, 0);
  const openaiTokens    = days.reduce((s, d) => s + d.openai, 0);
  const manualTokens    = days.reduce((s, d) => s + d.manual, 0);
  const activeDays      = days.filter(d => d.total > 0).length;

  const modelList = Object.entries(byModel)
    .sort((a, b) => b[1].tokens - a[1].tokens)
    .slice(0, 10);

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-10">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">BuilderPulse</h1>
          <p className="text-gray-300 text-sm mt-1">Your AI API activity graph — like GitHub contributions, but for tokens.</p>
          <p className="text-gray-500 text-xs mt-1">Embed it in your README to show the world you build with AI every day.</p>
        </div>
        <div className="text-xs text-gray-500 font-mono bg-[#161b22] border border-gray-700 rounded px-3 py-2 whitespace-nowrap shrink-0">
          /widget.svg
        </div>
      </div>

      {/* Setup banner */}
      <SetupBanner />

      {/* Heatmap widget */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Activity — last 52 weeks</h2>
        <div className="rounded-lg overflow-hidden border border-gray-800">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/widget.svg" alt="AI Activity Heatmap" className="w-full" />
        </div>
      </div>

      {/* Bar chart widget */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Daily usage — last 30 days</h2>
        <div className="rounded-lg overflow-hidden border border-gray-800">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/barchart.svg" alt="30-day bar chart" className="w-full" />
        </div>
      </div>

      {/* Streak */}
      {(currentStreak > 0 || longestStreak > 0) && (
        <div className="flex gap-4">
          <div className="flex-1 bg-[#161b22] border border-gray-800 rounded-lg p-4 text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Current streak</p>
            <p className="text-3xl font-bold text-orange-400 mt-1">{currentStreak > 0 ? `🔥 ${currentStreak}` : '—'}</p>
            <p className="text-xs text-gray-600 mt-1">days</p>
          </div>
          <div className="flex-1 bg-[#161b22] border border-gray-800 rounded-lg p-4 text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Longest streak</p>
            <p className="text-3xl font-bold text-yellow-400 mt-1">{longestStreak}</p>
            <p className="text-xs text-gray-600 mt-1">days</p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total tokens',  value: fmt(totalTokens),                     color: 'text-purple-400' },
          { label: 'Active days',   value: String(activeDays),                    color: 'text-blue-400'   },
          { label: 'Est. spend',    value: fmtCost(result.estimatedCostTotal),    color: 'text-green-400'  },
          { label: 'Anthropic',     value: fmt(anthropicTokens),                  color: 'text-orange-400' },
          { label: 'OpenAI',        value: fmt(openaiTokens),                     color: 'text-cyan-400'   },
          { label: 'Manual',        value: fmt(manualTokens),                     color: 'text-gray-400'   },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-[#161b22] border border-gray-800 rounded-lg p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Badges */}
      <Badges totalTokens={totalTokens} currentStreak={currentStreak} longestStreak={longestStreak} activeDays={activeDays} />

      {/* Model breakdown */}
      {modelList.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Model breakdown</h2>
          <div className="border border-gray-800 rounded-lg overflow-hidden divide-y divide-gray-800">
            {modelList.map(([model, { tokens, cost, source }]) => {
              const pct = Math.round((tokens / totalTokens) * 100);
              return (
                <div key={model} className="bg-[#161b22] px-4 py-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${source === 'anthropic' ? 'bg-orange-950 text-orange-400' : 'bg-cyan-950 text-cyan-400'}`}>
                        {source === 'anthropic' ? 'Anthropic' : 'OpenAI'}
                      </span>
                      <span className="text-sm text-white font-mono">{model}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span>{fmt(tokens)} tokens</span>
                      <span className="text-gray-600">{fmtCost(cost)}</span>
                    </div>
                  </div>
                  <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${source === 'anthropic' ? 'bg-orange-500' : 'bg-cyan-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Embed */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Embed</h2>
        <p className="text-xs text-gray-500">Paste into any GitHub README or markdown file. Replace the URL with your deployed Vercel URL.</p>
        <div className="bg-[#161b22] border border-gray-800 rounded-lg p-4 font-mono text-xs text-gray-400 space-y-1">
          <p>![AI Activity](https://your-builderpulse.vercel.app/widget.svg)</p>
          <p className="text-gray-600">![Anthropic only](https://your-builderpulse.vercel.app/widget.svg?source=anthropic)</p>
          <p className="text-gray-600">![Bar chart](https://your-builderpulse.vercel.app/barchart.svg)</p>
          <p className="text-gray-600">![Light mode](https://your-builderpulse.vercel.app/widget.svg?theme=light&color=green)</p>
        </div>
      </div>

      {/* Log manual session */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Log manual session</h2>
        <p className="text-xs text-gray-500">For claude.ai or ChatGPT sessions that don&apos;t go through the API.</p>
        <LogForm />
      </div>

      {/* Recent manual sessions */}
      {sessions.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Manual sessions</h2>
          <div className="divide-y divide-gray-800 border border-gray-800 rounded-lg overflow-hidden">
            {[...sessions].reverse().slice(0, 20).map(s => (
              <div key={s.id} className="flex items-center justify-between px-4 py-3 bg-[#161b22] text-sm">
                <div>
                  <span className="text-white font-medium">{s.date}</span>
                  <span className="text-gray-500 ml-3">{s.source}</span>
                  {s.note && <span className="text-gray-400 ml-3 italic">{s.note}</span>}
                </div>
                <span className="text-purple-400 font-mono">{fmt(s.tokens_estimated)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
