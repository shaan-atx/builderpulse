import { aggregateUsage } from '@/lib/aggregate';
import { readSessions } from '@/lib/manual';
import LogForm from './LogForm';

export default async function Dashboard() {
  const data     = await aggregateUsage(365);
  const sessions = readSessions();

  const totalTokens     = data.reduce((s, d) => s + d.total, 0);
  const anthropicTokens = data.reduce((s, d) => s + d.anthropic, 0);
  const openaiTokens    = data.reduce((s, d) => s + d.openai, 0);
  const manualTokens    = data.reduce((s, d) => s + d.manual, 0);
  const activeDays      = data.filter(d => d.total > 0).length;

  function fmt(n: number) {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
    return n.toString();
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">BuilderPulse</h1>
          <p className="text-gray-400 text-sm mt-1">Your AI activity — last 365 days</p>
        </div>
        <div className="text-xs text-gray-500 font-mono bg-[#161b22] border border-gray-700 rounded px-3 py-2">
          /widget.svg
        </div>
      </div>

      {/* Widget preview */}
      <div className="rounded-lg overflow-hidden border border-gray-800">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/widget.svg" alt="AI Activity Heatmap" className="w-full" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total tokens', value: fmt(totalTokens), color: 'text-purple-400' },
          { label: 'Active days',  value: activeDays.toString(), color: 'text-blue-400' },
          { label: 'Anthropic',    value: fmt(anthropicTokens), color: 'text-orange-400' },
          { label: 'OpenAI',       value: fmt(openaiTokens),    color: 'text-green-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-[#161b22] border border-gray-800 rounded-lg p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Widget URLs */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Embed</h2>
        <div className="bg-[#161b22] border border-gray-800 rounded-lg p-4 font-mono text-xs text-gray-400 space-y-1">
          <p>![AI Activity](https://your-builderpulse.vercel.app/widget.svg)</p>
          <p className="text-gray-600">![Anthropic only](https://your-builderpulse.vercel.app/widget.svg?source=anthropic&color=blue)</p>
          <p className="text-gray-600">![Light mode](https://your-builderpulse.vercel.app/widget.svg?theme=light&color=green)</p>
        </div>
      </div>

      {/* Log manual session */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Log manual session</h2>
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

      {manualTokens > 0 && (
        <p className="text-xs text-gray-600 text-center">
          {fmt(manualTokens)} tokens logged manually
        </p>
      )}
    </div>
  );
}
