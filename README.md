# Beanstalk

## FDA food recall records without the guesswork

Beanstalk is a calm, searchable interface for the FDA's food enforcement archive and CAERS adverse event early signals. Search by product, hazard, or company; narrow results by risk class, status, state, or dietary concern; then open a record for its source fields and FDA links.

[Open the live app](https://jacobyoby.github.io/beanstalk/) · [Browse openFDA's source](https://open.fda.gov/apis/food/enforcement/)

> Beanstalk is a record browser, not a real-time safety alert service. FDA statuses may be out of date. Verify the source notice before acting on a recall.

## What it does

- Searches FDA food enforcement records by product, reason, and recalling firm.
- Surfaces Early Signals from unverified CAERS adverse event reports.
- Filters by FDA classification, status, distribution state, and dietary terms.
- Shows provenance, distribution, code information, and source links in a detail drawer.
- Saves successful queries in the browser so a clearly labeled saved copy can remain available during a temporary FDA/API failure.
- Supports a local watchlist with optional browser alerts while the app is open.
- Installs as a lightweight PWA and includes an explicit fictional demo mode at `?demo=1`.

Live mode uses FDA records. Demo records are labeled fictional; they are never presented as live recalls.

## Run it locally

```bash
git clone https://github.com/jacobyoby/beanstalk.git
cd beanstalk/food-recall-app
npm ci
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The local Vite server proxies FDA requests through `/api/food` and can add `OPENFDA_API_KEY` server-side when one is configured. The client bundle does not contain an API key.

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

Beanstalk reads the [openFDA Food Enforcement API](https://open.fda.gov/apis/food/enforcement/) and [openFDA Food Adverse Event API](https://open.fda.gov/apis/food/event/) (CAERS). The app preserves FDA-provided fields, identifies saved results when live retrieval fails, and links back to FDA source views for verification.

This project is not medical advice. For meat, poultry, or processed egg products, also check [USDA FSIS recalls](https://www.fsis.usda.gov/recalls).

## Support

[Support JACOBRAKAI FOUNDATION](https://donate.stripe.com/eVq4gy97DanS9h60phfrW00), a 501(c)(3) public charity.
