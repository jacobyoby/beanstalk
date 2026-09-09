# Beanstalk — Food Recall Tracker

Search and filter FDA + USDA FSIS food recalls and CAERS adverse event early signals, with real-time alerts, dietary concern matching, and offline-capable PWA.

## Stack
Vite + React 18 + TypeScript + Tailwind CSS + PWA (Workbox)

## Data
- **Primary recalls (FDA)**: [openFDA Food Enforcement API](https://api.fda.gov/food/enforcement.json) — 29,000+ records, paginated
- **USDA FSIS** (meat/poultry/egg): RSS feed `https://www.fsis.usda.gov/rss/food-recall-notification-and-destruction-orders-rss-feed.xml`
  - No public REST API; browser CORS is blocked (EdgeCast CDN 403)
- **Early Signals (CAERS)**: [openFDA Food Adverse Event API](https://api.fda.gov/food/event.json) — same proxy/auth/rate limits as enforcement
- **API Key**: Optional via `VITE_OPENFDA_KEY` env var (increases rate limit from 40 to 240 req/min)
- **Cache**: 6-hour localStorage cache with LRU eviction for offline/stale serving
- **Demo Mode**: Add `?demo=1` to URL for fictional test data
- **Fallback**: `src/lib/mockData.ts` (FDA + FSIS recalls) and `src/lib/mockEvents.ts` (adverse events) when live sources are unreachable

### USDA FSIS architecture (hybrid)
1. **Dev**: Vite proxies raw RSS at `/api/fsis-rss/*` (CORS bypass). Client parses XML → `Recall` with `source: 'USDA'`.
2. **Prod (static / GitHub Pages)**: `npm run prebuild` → `scripts/fetch-fsis.mjs` bakes `public/data/fsis-recalls.json`. Client loads same-origin static JSON.
3. **Optional future serverless**: same-origin `GET /api/fsis/recalls` returning parsed JSON (Cloudflare Worker / Vercel). Client already probes this path first.

FDA remains client-side (with optional key proxy). USDA never calls a public CORS proxy service.

## Run
```bash
cd food-recall-app
npm install
npm run dev    # http://localhost:5173
npm run fetch:fsis   # refresh public/data/fsis-recalls.json
npm run build  # output: dist/ (includes baked FSIS JSON)
npm run test   # vitest (unit + component)
```

## Features
- **Tabs**: **Recalls** (FDA openFDA + USDA FSIS enforcement) and **Early Signals** (unverified CAERS adverse event reports)
- **Unified recall feed**: FDA + USDA FSIS, sorted by date, with FDA/USDA source badges on cards and detail
- **Search**: Debounced cross-field search (product, reason, firm, brand, hazard, reaction) with grouped OR clauses
- **Early Signals**: Search product brand / reactions / outcomes; FDA “not scientifically verified” disclaimer on every event surface; related CAERS links on recall detail
- **Filters**: Classification (I/II/III), Status (Ongoing/Completed/Terminated), Distribution State, Dietary Concerns (14 allergen types with negation handling) — recall tab only
- **Watchlist**: Save keywords for browser notification alerts when matching recalls (both sources: product, reason, firm, brand, hazard, headline) or adverse event reports appear
- **Recall detail**: FSIS fields (establishment #, brand, hazard, FSIS link) plus FDA iRES / openFDA JSON links
- **Graceful soft-fail**: FSIS outage does not block FDA results
- **Alerts**: Browser push notifications via Notification API, permission-gated
- **PWA**: Installable, offline-capable with Workbox precaching and service worker
- **Dark Mode**: OS-preference detection with manual toggle
- **Accessibility**: WCAG 2.1 AA compliant — proper labels, contrast ratios (4.5:1+ text, 3:1+ non-text), focus indicators, keyboard navigation, focus-trapped modal, skip link, aria-live regions
- **Responsive**: Single-column mobile, collapsible filters, 2-col grid on desktop with sticky sidebar
- **Demo**: `?demo=1` with conspicuously fictional recall and event data

## Test Coverage
- `api.test.ts` — API fetching, caching, error handling, search clause building, FDA+FSIS merge
- `fsis.test.ts` — FSIS RSS parse, host checks, merge/sort, watchlist fields, soft-fail
- `events.test.ts` — CAERS mapping, search, errors, demo mode, related-event lookup
- `dietary.test.ts` — Allergen matching, negation, predicate building
- `RecallCard.test.tsx` — Rendering, interaction, a11y attributes
- `watchlist.test.ts` — localStorage CRUD, type validation
- `WatchlistPanel.test.tsx` — Form submission, item management, a11y
- `formatDate.test.ts` — Date formatting, new-recall detection
- `notifications.test.ts` — Permission flow, send/create
- `SearchBar.test.tsx` — Label, value, onChange (includes reaction placeholder)
- `FilterPanel.test.tsx` — Select options, onChange, clear

## Deploy
Any static host (Vercel, Netlify, Cloudflare Pages, GitHub Pages):
```bash
npm run build  # outputs dist/ (includes baked FSIS JSON)
```

## Environment Variables
| Variable | Required | Description |
|---|---|---|
| `VITE_OPENFDA_KEY` | No | openFDA API key (40→240 req/min) |
| `VITE_DEMO` | No | Set to `true` to enable demo mode by default |
