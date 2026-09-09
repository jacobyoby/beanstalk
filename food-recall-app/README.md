# Beanstalk — Food Recall Tracker

Responsive Food Recall app — search/filter FDA food recalls with openFDA data.

## Stack
Vite + React 18 + TypeScript + Tailwind CSS

## Data
- Primary: `https://api.fda.gov/food/enforcement.json` (paginated, no key required)
- Offline fallback: stale cached data from the last successful fetch (no automatic mock fallback)
- Demo mode: add `?demo=1` to URL for fictional mock data (see `src/lib/mockData.ts`)

## Run
```bash
cd food-recall-app
npm install
npm run dev    # http://localhost:5173
npm run build
npm run preview
```

## Features
- Responsive layout: single-col mobile, 2-col grid + sticky filters on desktop
- Recall list with search (debounced, product/reason/firm), classification & status filters, pagination
- Recall detail drawer/slide-over
- Tailwind styling, accessible controls
- Stale-cache fallback when openFDA is unreachable; optional demo mode via `?demo=1`

## Insights surfaced
Pathogen contamination (~40-50% Salmonella) dominates 2025-2026; Class I recalls ~70%. Banner highlights 16 active FDA CORE investigations.

## Deploy
Any static host (Vercel, Netlify, Cloudflare Pages): `npm run build` outputs `dist/`.
