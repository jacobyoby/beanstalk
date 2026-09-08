# Beanstalk — Food Recall Tracker

Responsive Food Recall app — search/filter FDA food recalls with openFDA + mock fallback.

## Stack
Vite + React 18 + TypeScript + Tailwind CSS

## Data
- Primary: `https://api.fda.gov/food/enforcement.json` (paginated, no key required)
- Fallback: `src/lib/mockData.ts` seeded with 2025-2026 major recalls (Jalapeños/Salmonella, Powdered Milk, Pasta/Listeria, undeclared allergens, plastic, Moringa)

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
- Graceful fallback to mock data when openFDA unreachable

## Insights surfaced
Pathogen contamination (~40-50% Salmonella) dominates 2025-2026; Class I recalls ~70%. Banner highlights 16 active FDA CORE investigations.

## Deploy
Any static host (Vercel, Netlify, Cloudflare Pages): `npm run build` outputs `dist/`.
