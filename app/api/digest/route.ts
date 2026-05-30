import { NextResponse } from 'next/server';
import { aggregateUsage } from '@/lib/aggregate';
import { fmtCost } from '@/lib/pricing';

export const dynamic = 'force-dynamic';

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export async function GET(request: Request) {
  // Verify cron secret so only Vercel can trigger this
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const resendKey  = process.env.RESEND_API_KEY;
  const digestEmail = process.env.DIGEST_EMAIL;
  if (!resendKey || !digestEmail) {
    return NextResponse.json({ error: 'RESEND_API_KEY and DIGEST_EMAIL must be set' }, { status: 400 });
  }

  // Last 7 days
  const result = await aggregateUsage(7);
  const { days, currentStreak, estimatedCostTotal } = result;

  const totalTokens     = days.reduce((s, d) => s + d.total, 0);
  const anthropicTokens = days.reduce((s, d) => s + d.anthropic, 0);
  const openaiTokens    = days.reduce((s, d) => s + d.openai, 0);
  const activeDays      = days.filter(d => d.total > 0).length;

  const subject = `BuilderPulse weekly: ${fmt(totalTokens)} tokens, ${fmtCost(estimatedCostTotal)}`;

  const html = `<!DOCTYPE html>
<html>
<body style="font-family:system-ui,sans-serif;background:#0d1117;color:#e6edf3;max-width:480px;margin:0 auto;padding:32px 24px;">
  <h1 style="font-size:20px;font-weight:700;margin:0 0 4px;">BuilderPulse</h1>
  <p style="color:#8b949e;font-size:13px;margin:0 0 32px;">Your AI activity — last 7 days</p>

  <table style="width:100%;border-collapse:collapse;margin-bottom:32px;">
    <tr>
      <td style="padding:12px 16px;background:#161b22;border:1px solid #30363d;border-radius:6px 6px 0 0;">
        <div style="font-size:11px;color:#8b949e;text-transform:uppercase;letter-spacing:.05em;">Total tokens</div>
        <div style="font-size:28px;font-weight:700;color:#a78bfa;">${fmt(totalTokens)}</div>
      </td>
    </tr>
    <tr>
      <td style="padding:12px 16px;background:#161b22;border:1px solid #30363d;border-top:none;">
        <div style="font-size:11px;color:#8b949e;text-transform:uppercase;letter-spacing:.05em;">Est. spend</div>
        <div style="font-size:28px;font-weight:700;color:#4ade80;">${fmtCost(estimatedCostTotal)}</div>
      </td>
    </tr>
    <tr>
      <td style="padding:12px 16px;background:#161b22;border:1px solid #30363d;border-top:none;border-radius:0 0 6px 6px;">
        <div style="display:flex;gap:32px;">
          <div>
            <div style="font-size:11px;color:#8b949e;text-transform:uppercase;letter-spacing:.05em;">Active days</div>
            <div style="font-size:20px;font-weight:700;color:#60a5fa;">${activeDays} / 7</div>
          </div>
          <div>
            <div style="font-size:11px;color:#8b949e;text-transform:uppercase;letter-spacing:.05em;">Current streak</div>
            <div style="font-size:20px;font-weight:700;color:#f97316;">${currentStreak > 0 ? `🔥 ${currentStreak} days` : '—'}</div>
          </div>
        </div>
      </td>
    </tr>
  </table>

  <table style="width:100%;border-collapse:collapse;margin-bottom:32px;">
    <tr>
      <td style="padding:8px 16px;background:#161b22;border:1px solid #30363d;border-radius:6px 6px 0 0;border-bottom:none;">
        <span style="font-size:11px;color:#f97316;font-weight:600;">ANTHROPIC</span>
        <span style="float:right;font-size:13px;color:#e6edf3;">${fmt(anthropicTokens)} tokens</span>
      </td>
    </tr>
    <tr>
      <td style="padding:8px 16px;background:#161b22;border:1px solid #30363d;border-radius:0 0 6px 6px;">
        <span style="font-size:11px;color:#38bdf8;font-weight:600;">OPENAI</span>
        <span style="float:right;font-size:13px;color:#e6edf3;">${fmt(openaiTokens)} tokens</span>
      </td>
    </tr>
  </table>

  <p style="font-size:12px;color:#8b949e;text-align:center;">
    <a href="${process.env.NEXT_PUBLIC_URL ?? 'http://localhost:3000'}" style="color:#8b949e;">View your dashboard</a>
  </p>
</body>
</html>`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'BuilderPulse <digest@builderpulse.dev>',
      to:   [digestEmail],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('[digest] Resend error:', err);
    return NextResponse.json({ error: err }, { status: 500 });
  }

  return NextResponse.json({ ok: true, subject });
}
