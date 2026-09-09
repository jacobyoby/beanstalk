# Beanstalk

## FDA + USDA food recall records without the guesswork

Beanstalk is a calm, searchable interface for the FDA's food enforcement archive, USDA FSIS meat/poultry/egg recalls, and CAERS adverse event early signals. Search by product, hazard, brand, or company; narrow results by risk class, status, state, or dietary concern; then open a record for its source fields and agency links.

[Open the live app](https://jacobyoby.github.io/beanstalk/) · [Browse openFDA's source](https://open.fda.gov/apis/food/enforcement/)

> Beanstalk is a record browser, not a real-time safety alert service. FDA recall data is **as published by openFDA**, not a live FDA recall-lifecycle feed. Statuses may stay Ongoing after a recall ends. Verify the source notice before acting.

## What it does

- Searches FDA food enforcement records and USDA FSIS recall notices by product, reason, brand, hazard, and recalling firm.
- Surfaces Early Signals from unverified CAERS adverse event reports.
- Filters by FDA classification, status, distribution state, and dietary terms.
- Shows provenance, distribution, code information, FSIS detail fields, and source links in a detail drawer.
- Saves successful queries in the browser so a clearly labeled saved copy can remain available during a temporary FDA/API failure.
- Supports a local watchlist with optional browser alerts while the app is open.
- Installs as a lightweight PWA and includes an explicit fictional demo mode at `?demo=1`.

Live mode uses records **as published by openFDA**. Demo records are labeled fictional; they are never presented as live recalls.

## Run it locally

```bash
git clone https://github.com/jacobyoby/beanstalk.git
cd beanstalk/food-recall-app
npm ci
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The local Vite server proxies FDA requests through `/api/food` and raw USDA RSS through `/api/fsis-rss`. FDA can add `OPENFDA_API_KEY` server-side when one is configured; USDA static builds bake `public/data/fsis-recalls.json` during `prebuild`. The client bundle does not contain an API key.

## Verify a change

Run these from `food-recall-app/`:

```bash
npm run check
npx tsc --noEmit
npm test
npm run build
```

For UI changes, also check the live-data, empty, unavailable, filtered, paginated, detail-drawer, keyboard, dark-mode, and 375/768/1280px paths.

## Project layout

```text
food-recall-app/
├── src/components/   UI and accessible interaction patterns
├── src/lib/          openFDA mapping, filters, caching, and tests
├── src/types/        normalized recall data types
└── public/           PWA icons and static assets
```

## Data and trust boundary

Beanstalk reads the [openFDA Food Enforcement API](https://open.fda.gov/apis/food/enforcement/), [USDA FSIS recalls](https://www.fsis.usda.gov/recalls), and the [openFDA Food Adverse Event API](https://open.fda.gov/apis/food/event/) (CAERS). FDA records are **as published by openFDA**, not a live FDA recall-lifecycle feed. The app preserves agency-provided fields, identifies saved results when live retrieval fails, and links back to source views for verification.

### openFDA search and freshness gotchas

- **Empty / no-match search → HTTP 404** is expected. openFDA returns `404` + “No matches found”; Beanstalk treats that as zero results, not an outage.
- **Wednesday publish lag.** The enforcement dataset typically refreshes mid-week. Do not treat “retrieved today” as a same-day FDA lifecycle update.
- **`skip` max 25,000.** openFDA rejects deeper offset paging. This app caps `skip` and does **not** use `search_after`. Narrow filters to see more of a large result set.
- **Related Events** use a parenthesized **OR** of product tokens (not a single phrase; [#102](https://github.com/jacobyoby/beanstalk/pull/102)). Do not treat a zero-hit related-events list as an API failure.

This project is not medical advice. For meat, poultry, or processed egg products, also check [USDA FSIS recalls](https://www.fsis.usda.gov/recalls).

## Support

[Support JACOBRAKAI FOUNDATION](https://donate.stripe.com/eVq4gy97DanS9h60phfrW00), a 501(c)(3) public charity (legal name JACOBRAKAI FOUNDATION; EIN 33-3382083).
