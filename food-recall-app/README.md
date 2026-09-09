# Beanstalk — Food Recall Tracker

Search and filter FDA food recalls with real-time alerts, dietary concern matching, and offline-capable PWA.

## Stack
Vite + React 18 + TypeScript + Tailwind CSS + PWA (Workbox)

## Data
- **Primary**: [openFDA Food Enforcement API](https://api.fda.gov/apis/food/enforcement/) — 29,000+ records, paginated
- **API Key**: Optional via `VITE_OPENFDA_KEY` env var (increases rate limit from 40 to 240 req/min)
- **Cache**: 6-hour localStorage cache with LRU eviction for offline/stale serving
- **Demo Mode**: Add `?demo=1` to URL for fictional test data
- **Fallback**: `src/lib/mockData.ts` when openFDA is unreachable

## Run
```bash
cd food-recall-app
npm install
npm run dev    # http://localhost:5173
npm run build  # output: dist/
npm run test   # 122 tests across 7 files
```

## Features
- **Search**: Debounced cross-field search (product, reason, firm) with grouped OR clauses
- **Filters**: Classification (I/II/III), Status (Ongoing/Completed/Terminated), Distribution State, Dietary Concerns (14 allergen types with negation handling)
- **Watchlist**: Save keywords for browser notification alerts when matching recalls appear
- **Alerts**: Browser push notifications via Notification API, permission-gated
- **PWA**: Installable, offline-capable with Workbox precaching and service worker
- **Dark Mode**: OS-preference detection with manual toggle
- **Accessibility**: WCAG 2.1 AA compliant — proper labels, contrast ratios (4.5:1+ text, 3:1+ non-text), focus indicators, keyboard navigation, focus-trapped modal, skip link, aria-live regions
- **Responsive**: Single-column mobile, collapsible filters, 2-col grid on desktop with sticky sidebar

## Test Coverage
122 tests across 7 test files:
- `api.test.ts` (26) — API fetching, caching, error handling, search clause building
- `dietary.test.ts` (24) — Allergen matching, negation, predicate building
- `RecallCard.test.tsx` (20) — Rendering, interaction, a11y attributes
- `watchlist.test.ts` (18) — localStorage CRUD, type validation
- `WatchlistPanel.test.tsx` (14) — Form submission, item management, a11y
- `formatDate.test.ts` (11) — Date formatting, new-recall detection
- `notifications.test.ts` (9) — Permission flow, send/create
- `SearchBar.test.tsx` (5) — Label, value, onChange
- `FilterPanel.test.tsx` (8) — Select options, onChange, clear

## Deploy
Any static host (Vercel, Netlify, Cloudflare Pages, GitHub Pages):
```bash
npm run build  # outputs dist/
```

## Environment Variables
| Variable | Required | Description |
|---|---|---|
| `VITE_OPENFDA_KEY` | No | openFDA API key (40→240 req/min) |
| `VITE_DEMO` | No | Set to `true` to enable demo mode by default |
