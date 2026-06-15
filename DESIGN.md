# Robotaxi Unsupervised Tracker — Design Document

## 1. Project Overview

A real-time dashboard that tracks Tesla unsupervised robotaxi deployments across US cities by scraping live data from [robotaxitracker.com](https://robotaxitracker.com). The product is a read-only analytics surface — no user accounts, no writes, no auth.

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────┐
│                     Browser                         │
│  Vite + React + Tailwind + Chart.js                 │
│  localhost:5173  (dev) / CDN (prod)                 │
│                                                     │
│  Auto-fetches /api/stats every 60s                  │
└───────────────────┬─────────────────────────────────┘
                    │ HTTP (proxied in dev, direct in prod)
┌───────────────────▼─────────────────────────────────┐
│                  Express Server                      │
│  Node.js · localhost:3001                           │
│                                                     │
│  GET  /api/stats   → returns cached JSON            │
│  POST /api/refresh → triggers manual re-scrape      │
│                                                     │
│  Background job: scrapes every 10 minutes           │
└───────────────────┬─────────────────────────────────┘
                    │ axios (4 parallel HTTP GETs)
┌───────────────────▼─────────────────────────────────┐
│            robotaxitracker.com (Next.js SSR)        │
│  ?provider=tesla&area=austin                        │
│  ?provider=tesla&area=bayarea                       │
│  ?provider=tesla&area=dallas                        │
│  ?provider=tesla&area=houston                       │
└─────────────────────────────────────────────────────┘
                    │
          server/data/cache.json     (latest snapshot)
          server/data/history.json   (daily time series, 365d)
```

### Key architectural decisions

| Decision | Choice | Rationale |
|---|---|---|
| Scraping method | axios + regex (no Playwright) | Target site uses Next.js SSR — data is in raw HTML, no JS execution needed |
| Data extraction | Two-layer: HTML regex → JSON blob regex | HTML patterns for display values; embedded RSC JSON for ride stats |
| Cache storage | Flat JSON files | Zero-dependency, sufficient for single-server MVP, trivially portable |
| History seeding | Synthetic 60-day curve on first run | Chart is immediately useful; real data fills in from day 1 |
| City totals | Sum unsupervised per city; cybercabs = max(all cities) | Cybercabs is a global fleet shown identically in all city views |
| Hero metric | Cross-city total unsupervised | More interesting than per-city; per-city detail is in the breakdown |
| Metric cards | Austin-specific data | Austin has the richest data (ride %, counts); other cities omit ride stats |

---

## 3. Data Pipeline

### 3.1 Scraping Strategy

The target site serves fully server-rendered HTML (Next.js SSR). Two extraction layers are tried in order:

**Layer 1 — HTML metric card regex**
Each stat card follows a predictable DOM pattern:
```html
<span class="...">LABEL</span>
...
<div class="... font-mono ... leading-none">VALUE</div>
```
Regex patterns match label → skip SVG/button markup → capture the `font-mono` value div.

**Layer 2 — Inline style / text patterns**
- Unsupervised % (7d): extracted from `style="width:XX.XX%"` on the progress bar element
- Ride counts: extracted from `"25 of 33 rides"` text pattern

**Layer 3 — Embedded RSC JSON (fallback)**
The page embeds escaped RSC JSON containing `unsupervisedPassengerCount30d`, per-window ride stats, and the full vehicle array. Used as a fallback if HTML patterns fail.

### 3.2 Verified Regex Patterns (Austin, as of June 2026)

```js
riderVehicles:       /Rider Vehicles[\s\S]{0,800}?text-5xl[^"]*"[^>]*><span>(\d+)<\/span>/
unsupervised:        /Unsupervised<\/span>[\s\S]{0,200}?font-mono[^"]*"[^>]*>(\d+)</
inactive:            /Inactive<\/span>[\s\S]{0,200}?font-mono[^"]*"[^>]*>(\d+)</
cybercabs:           /Cybercabs<\/span>[\s\S]{0,200}?font-mono[^"]*"[^>]*>(\d+)</
unsupervisedPercent: /style="width:([\d.]+)%"/     // progress bar inline style
rides:               /(\d+) of (\d+) rides/
```

### 3.3 Data Shape

**`/api/stats` response**
```json
{
  "current": {
    "cities": {
      "austin":  { "label": "Austin",   "riderVehicles": 27, "unsupervised": 22,
                   "inactive": 77, "cybercabs": 42, "unsupervisedPercent": 75.8,
                   "unsupervisedRides": 25, "totalRides": 33 },
      "bayarea": { "label": "Bay Area", "riderVehicles": 27, "unsupervised": 22, ... },
      "dallas":  { "label": "Dallas",   "riderVehicles": 96, "unsupervised": 33, ... },
      "houston": { "label": "Houston",  "riderVehicles": 96, "unsupervised": 33, ... }
    },
    "totals": {
      "riderVehicles": 246,
      "unsupervised": 110,
      "inactive": 1426,
      "cybercabs": 58,
      "unsupervisedPercent": 75.8
    },
    "lastUpdated": "2026-06-15T05:38:38.427Z"
  },
  "history": [
    { "date": "2026-04-16", "unsupervised": 5, "riderVehicles": 10, "cybercabs": 19 },
    ...
  ]
}
```

### 3.4 Refresh Schedule

| Trigger | Interval | Endpoint |
|---|---|---|
| Server background job | Every 10 minutes | Internal |
| Frontend auto-poll | Every 60 seconds | `GET /api/stats` |
| Manual user action | On demand | `POST /api/refresh` → re-scrapes → re-fetches |

---

## 4. UI Design System

### 4.1 Color Palette

| Token | Hex | Usage |
|---|---|---|
| `bg` | `#0a0a0a` | Page background |
| `surface` | `#141414` | Header, nested backgrounds |
| `card` | `#1c1c1c` | Metric cards, chart panel |
| `border` | `#2a2a2a` | All card/section borders |
| `accent` | `#e31937` | Tesla red — hero number, Cybercabs, Unsupervised % |
| `accent-dim` | `#b81229` | Hover states on accent |
| `muted` | `#6b7280` | Label text, timestamps |
| `dim` | `#9ca3af` | Secondary body text |
| `white` | `#ffffff` | Primary values, headings |

### 4.2 Typography

| Role | Font | Weight | Size |
|---|---|---|---|
| Hero number | Inter | 900 (Black) | `clamp(6rem, 20vw, 10rem)` — fluid |
| Metric value | Inter | 700 (Bold) | `1.875rem` (3xl) |
| Section label | Inter | 700 (Bold) | `0.75rem` — `uppercase tracking-widest` |
| Body / sublabel | Inter | 400 | `0.75rem` |
| Monospace values | JetBrains Mono | 700 | `1.125rem` (city bar counts) |

### 4.3 Component Map

```
App
├── Header
│   ├── Logo (red square + icon)
│   ├── Title + subtitle
│   ├── "Updated Xs ago" + live dot
│   └── Refresh button (spinner state)
│
├── HeroCounter
│   ├── LIVE badge (animated dot)
│   ├── Big number (count-up animation, red glow)
│   ├── "Unsupervised Vehicles" label
│   └── Sub-stats pill (75.8% · 33 rides)
│
├── MetricCards (2×2 grid → 4-col on sm+)
│   ├── Rider Vehicles   🚗  [white]
│   ├── Inactive (30d)   💤  [white]
│   ├── Cybercabs        ⚡  [accent red]
│   └── Unsupervised %   🤖  [accent red]
│
├── CityBreakdown
│   └── CityRow × 4  (emoji · name · bar · count · rider · %)
│       Colors: red (Austin) · blue (Bay Area) · yellow (Dallas) · purple (Houston)
│
├── GrowthChart
│   ├── Range tabs: 7D · 30D · 90D · All
│   └── Line chart — Unsupervised (red) + Rider Vehicles (indigo)
│
└── Footer attribution
```

### 4.4 Animation Inventory

| Name | CSS | Used on |
|---|---|---|
| `hero-glow` | `text-shadow` with 3-layer red radial blur | Hero number |
| `count-up` | `requestAnimationFrame` ease-out cubic | Hero number on mount/update |
| `fade-in` | `opacity 0 → 1` + `translateY 8px → 0` | All major sections |
| `livePulse` | `opacity + scale` 2s loop | LIVE badge dot, header dot |
| `barFill` | `width: 0 → X%` 1s ease-out | City breakdown bars |
| `animate-spin` | Tailwind built-in | Refresh button icon |

### 4.5 Responsive Breakpoints

| Viewport | Layout changes |
|---|---|
| `< 640px` (mobile) | Header subtitle hidden; metric grid 2-col; city row hides rider/% columns; chart legend compact |
| `640px+` (sm) | Full header subtitle; 4-col metric grid; city rider counts visible |
| `768px+` (md) | City unsupervised % column appears |

---

## 5. File Structure

```
robotaxi-tracker/
├── package.json                  # root scripts (dev:server, dev:client)
│
├── server/
│   ├── package.json              # express, axios, cors
│   ├── index.js                  # Express server + refresh scheduler
│   ├── scraper.js                # Scraping logic (regex extraction)
│   └── data/
│       ├── cache.json            # Latest scrape snapshot (auto-generated)
│       └── history.json          # Daily time-series (auto-generated)
│
├── client/
│   ├── package.json              # react, chart.js, vite, tailwind
│   ├── vite.config.js            # Dev proxy: /api → :3001
│   ├── tailwind.config.js        # Custom color tokens + animations
│   ├── postcss.config.js
│   ├── index.html                # Inter font, favicon, root div
│   └── src/
│       ├── main.jsx
│       ├── App.jsx               # Data fetching + layout orchestration
│       ├── index.css             # Tailwind layers + custom keyframes
│       └── components/
│           ├── Header.jsx        # Sticky top bar + refresh button
│           ├── HeroCounter.jsx   # Big number with count-up hook
│           ├── MetricCard.jsx    # Generic stat card
│           ├── CityBreakdown.jsx # Horizontal bar rows per city
│           └── GrowthChart.jsx   # Chart.js line chart + range tabs
│
└── DESIGN.md                     # This file
```

---

## 6. API Reference

### `GET /api/stats`
Returns latest cached data + full history array. Does not trigger a scrape.

**Response:** `200 OK` with the full JSON shape shown in §3.3.  
**Error:** `503` if initial scrape hasn't completed yet.

### `POST /api/refresh`
Triggers an immediate re-scrape of all 4 city URLs, waits for completion, then returns.

**Response:** `{ "ok": true, "lastUpdated": "<ISO string>" }`

---

## 7. Deployment Notes

### Development
```bash
# Terminal 1
cd server && npm run dev     # Node --watch on :3001

# Terminal 2
cd client && npm run dev     # Vite HMR on :5173 (proxies /api → :3001)
```

### Production
- **Frontend** → build with `npm run build` → deploy `client/dist/` to Vercel / Netlify / any static host
- **Backend** → deploy `server/` to Railway / Render / Fly.io; set `PORT` env var
- **CORS** — `cors()` is already applied; set `VITE_API_URL` in client if API is on a different domain and update `fetch()` calls in `App.jsx`

### Environment Variables
| Var | Where | Default | Purpose |
|---|---|---|---|
| `PORT` | server | `3001` | Express listen port |
| `VITE_API_URL` | client build | _(empty — uses proxy)_ | Override API base URL for prod |

---

## 8. Known Limitations & Future Work

| Item | Notes |
|---|---|
| Bay Area deduplication | `?area=bayarea` returns the same counts as Austin — may be same fleet or wrong param value |
| Chart spike on day 1 | History seeded with per-Austin values; real cross-city scrapes create a step-change on first run |
| Waymo / Zoox | Site supports `?provider=waymo` and `?provider=zoox`; not yet wired up |
| Persistence | `history.json` is in-process; a server restart with missing file re-seeds synthetic history |
| Rate limiting | 4 city GETs every 10 min; add exponential backoff if the site starts blocking |
| No error retry | Failed city scrapes are logged but not retried until the next 10-min cycle |
