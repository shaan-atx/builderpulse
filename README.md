# BuilderPulse

**Embeddable AI activity graph for builders.** Show your daily token usage across Anthropic and OpenAI APIs — like a GitHub contribution graph, but for AI-native work.

![BuilderPulse](https://builderpulse-eta.vercel.app/widget.svg)

## What is this?

If you're building with AI APIs every day, you have no standard way to show that activity publicly. BuilderPulse fixes that. It fetches your real token usage from Anthropic and OpenAI, renders a 52-week heatmap, and gives you a single URL to embed anywhere.

```markdown
<!-- Paste into any GitHub README -->
![AI Activity](https://your-builderpulse.vercel.app/widget.svg)

<!-- 30-day bar chart -->
![Daily Usage](https://your-builderpulse.vercel.app/barchart.svg)
```

## Features

- **52-week heatmap** — GitHub-style activity grid, color-coded by source (orange = Anthropic, blue = OpenAI, diagonal = both)
- **30-day bar chart** — stacked daily bar chart at `/barchart.svg`
- **Streak counter** — current and longest builder streak, shown on widget and dashboard
- **Estimated cost** — per-model pricing applied to your actual usage, shown on the widget
- **Model breakdown** — see which Claude/GPT models you use most, with token + cost bars
- **Milestone badges** — 1M Club, 30-Day Streak, and more
- **Multi-source** — Anthropic API + OpenAI API, combined or filtered
- **Manual log** — self-report Claude.ai / ChatGPT sessions
- **Weekly email digest** — Monday morning summary via Resend (optional)
- **Zero leakage** — API keys stay in your environment variables, never in widget output
- **Self-hosted** — deploy your own instance; your data never touches a shared server

## Deploy in 5 minutes

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/shaan-atx/builderpulse&env=ANTHROPIC_API_KEY,OPENAI_API_KEY,MANUAL_LOG_SECRET)

Or manually:

```bash
git clone https://github.com/shaan-atx/builderpulse
cd builderpulse
npm install
cp .env.example .env.local
# Edit .env.local — see Configuration below
npm run dev
# Open http://localhost:3000
```

## Configuration

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | ✅ | Admin API key (`sk-ant-admin-...`) from [console.anthropic.com](https://console.anthropic.com/settings/api-keys) |
| `OPENAI_API_KEY` | ✅ | Restricted key with **Usage → Read** scope from [platform.openai.com](https://platform.openai.com/api-keys) |
| `MANUAL_LOG_SECRET` | ✅ | Any random string — protects the manual log endpoint |
| `DEFAULT_COLOR_SCHEME` | optional | `purple` \| `green` \| `orange` \| `blue` |
| `DEFAULT_THEME` | optional | `dark` \| `light` |
| `RESEND_API_KEY` | optional | For weekly email digest — free at [resend.com](https://resend.com) |
| `DIGEST_EMAIL` | optional | Email address to receive weekly digest |
| `CRON_SECRET` | optional | Random string to secure the digest cron endpoint |
| `NEXT_PUBLIC_URL` | optional | Your deployed URL (used in digest email link) |

> **Anthropic key:** Must be an Admin key, not a regular API key. Regular keys return 401.
> **OpenAI key:** Must be a Restricted key with the `api.usage.read` scope. Regular keys return 403.

## Pages

| URL | Description |
|---|---|
| `/` | Public profile — heatmap, bar chart, streak, stats, badges |
| `/dashboard` | Private dashboard — model breakdown, log manual sessions, embed snippets |
| `/widget.svg` | Embeddable SVG heatmap |
| `/barchart.svg` | Embeddable 30-day bar chart |
| `/api/aggregate` | Raw JSON usage data |
| `/api/manual` | POST/GET manual sessions (POST requires `Authorization: Bearer <MANUAL_LOG_SECRET>`) |

## Widget Parameters

| Param | Values | Default | Description |
|---|---|---|---|
| `source` | `all`, `anthropic`, `openai`, `manual` | `all` | Filter by source |
| `theme` | `dark`, `light` | `dark` | Color theme |
| `color` | `purple`, `green`, `orange`, `blue` | `purple` | Color scheme (single-source view only) |
| `days` | 1–90 | 30 | Bar chart day range (`/barchart.svg` only) |

**Examples:**
```
/widget.svg                              → all sources, dark
/widget.svg?source=anthropic            → Anthropic only, orange scale
/widget.svg?theme=light&color=green     → light mode, green (GitHub-style)
/barchart.svg?days=90                   → 90-day bar chart
```

## Log a manual session

```bash
curl -X POST https://your-builderpulse.vercel.app/api/manual \
  -H "Authorization: Bearer your-manual-log-secret" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2026-05-30",
    "tokens_estimated": 15000,
    "source": "claude.ai",
    "note": "Architecture session"
  }'
```

## Weekly email digest

Sign up free at [resend.com](https://resend.com), add `RESEND_API_KEY` + `DIGEST_EMAIL` + `CRON_SECRET` to your Vercel env vars, and you'll get a weekly Monday morning summary automatically via Vercel Cron.

## Privacy & Security

- Your API keys are **never** embedded in widget output
- Each person deploys their own instance — no shared server, no shared database
- API keys live in Vercel's encrypted environment variables
- The widget SVG contains only computed visuals (token counts and dates)
- No analytics, no telemetry, no third-party services

## License

MIT
