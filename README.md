# BuilderPulse

**Embeddable AI activity graph for builders.** Show your daily token usage across Anthropic and OpenAI APIs — like a GitHub contribution graph, but for AI-native work.

![BuilderPulse Example](https://your-deployment.vercel.app/widget.svg)

## What is this?

If you're building with AI APIs every day, you have no standard way to show that activity publicly. BuilderPulse fixes that. It fetches your real token usage from Anthropic and OpenAI, renders a 52-week heatmap, and gives you a single URL to embed anywhere.

```markdown
<!-- In your GitHub README or resume -->
![AI Activity](https://your-builderpulse.vercel.app/widget.svg)
```

## Features

- **52-week heatmap** — GitHub-style activity grid showing daily token usage
- **Daily bar chart** — 30 or 90-day bar chart with stacked source breakdown
- **Multi-source** — Anthropic API + OpenAI API, combined or filtered
- **Manual log** — Self-report Claude.ai / ChatGPT sessions via a simple API
- **Embeddable** — Single URL returns an SVG; works in GitHub READMEs, resumes, LinkedIn
- **Themes** — Dark / light, four color schemes (purple, green, orange, blue)
- **Zero leakage** — API keys stay in your environment variables, never in the widget output

## Deploy in 5 minutes

### Option A: One-click Vercel deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/builderpulse&env=ANTHROPIC_API_KEY,OPENAI_API_KEY,DASHBOARD_PASSWORD)

### Option B: Manual

```bash
# 1. Clone
git clone https://github.com/yourusername/builderpulse
cd builderpulse

# 2. Install
npm install

# 3. Configure
cp .env.example .env.local
# Edit .env.local with your API keys

# 4. Run
npm run dev
# Open http://localhost:3000
```

## Configuration

Copy `.env.example` to `.env.local` and set:

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | ✅ | Your Anthropic API key (usage:read scope) |
| `OPENAI_API_KEY` | ✅ | Your OpenAI API key |
| `DASHBOARD_PASSWORD` | ✅ | Password for your private dashboard |
| `DEFAULT_COLOR_SCHEME` | optional | `purple` \| `green` \| `orange` \| `blue` |
| `DEFAULT_THEME` | optional | `dark` \| `light` |

## Widget URL Parameters

Your widget lives at `/widget.svg`. Customize it with query params:

| Param | Values | Default | Description |
|---|---|---|---|
| `source` | `all`, `anthropic`, `openai`, `manual` | `all` | Filter by source |
| `theme` | `dark`, `light` | `dark` | Color theme |
| `color` | `purple`, `green`, `orange`, `blue` | `purple` | Heatmap color |

**Examples:**
```
/widget.svg                              → all sources, dark, purple
/widget.svg?source=anthropic&color=blue → Anthropic only, blue
/widget.svg?theme=light&color=green     → light mode, green (GitHub-style)
```

## API Endpoints

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/widget.svg` | GET | none | Embeddable SVG heatmap |
| `/api/aggregate` | GET | none | Raw JSON usage data |
| `/api/manual` | POST | none | Log a manual session |
| `/api/manual` | GET | none | List manual sessions |
| `/` | GET | password | Private dashboard |

### Log a manual session

```bash
curl -X POST https://your-builderpulse.vercel.app/api/manual \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2026-05-30",
    "tokens_estimated": 15000,
    "source": "claude.ai",
    "note": "Long conversation about product architecture"
  }'
```

## Privacy

- Your API keys are **never** embedded in the widget output
- The widget SVG contains only computed visuals (token counts and dates)
- No analytics, no telemetry, no third-party services
- Everything runs in your own Vercel deployment

## Contributing

PRs welcome. This is an open-source tool for AI builders, by AI builders.

## License

MIT
