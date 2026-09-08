# Beanstalk

Explore FDA food recall records by product, company, and recall reason.

Beanstalk brings recall descriptions, reported classifications, distribution text, and source links into a searchable browser interface. It is an early-stage research tool, with **v0.1 in development**.

[Roadmap](https://github.com/jacobyoby/ponder/issues/24) · [v0.1 milestone](https://github.com/jacobyoby/ponder/milestone/1) · [Report an issue](https://github.com/jacobyoby/ponder/issues/new/choose) · [FDA data source](https://open.fda.gov/apis/food/enforcement/)

## Explore the records

- Search product descriptions, recall reasons, and recalling firms.
- Inspect reported classifications, status, distribution, and available lot information.
- Open the underlying FDA record from the detail view.

The application lives in [`food-recall-app/`](food-recall-app/). The repository is still named `ponder`; Beanstalk is the product name.

## Building toward v0.1

| Area | Release work |
| --- | --- |
| Reliable results | Accurate filters and counts, complete lot data, and clear live, cached, unavailable, and demo states. |
| State coverage | Match where products were reportedly distributed, including nationwide and unclear distribution. |
| Dietary concerns | Find relevant recalls through attributable allergen and ingredient mentions, with unknown information kept explicit. |
| Accessible use | Keyboard-operable details, readable phone layouts, and consistent Beanstalk branding without emojis. |
| Release readiness | Server-side API-key handling, meaningful regression checks, and a verified deployment procedure. |

The [milestone](https://github.com/jacobyoby/ponder/milestone/1) is the current source of completion status. Distribution-state and dietary-concern matching are release goals, not assurances that a product is safe or suitable for a particular diet.

## Run locally

Use **Node.js 22.22.2 or later in the 22.x line** and npm. CI uses Node 22; the locked test dependencies require a recent patch release.

```sh
git clone https://github.com/jacobyoby/ponder.git
cd ponder/food-recall-app
npm ci
npm run dev
```

Open the address printed by Vite, normally [localhost:5173](http://localhost:5173).

From `food-recall-app/`, run the checks and preview a production build:

```sh
npm test
npm run build
npm run preview
```

The build output is `food-recall-app/dist/`. See the [development notes](food-recall-app/README.md) for the application layout and configuration boundaries.

## Understand the data

The [openFDA food enforcement dataset](https://open.fda.gov/apis/food/enforcement/) is updated weekly. Its reported status does not establish a recall's current lifecycle, and FDA says this endpoint should not be used for public alerting. Consult [FDA recall notices](https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts) and the linked source record when evaluating a recall.

This development version has known result, provenance, and accessibility limitations tracked in the roadmap. An empty result is not proof that a product is unaffected. Dietary matches cannot certify ingredients or dietary suitability.

## Contribute

Choose a scoped item from the [v0.1 roadmap](https://github.com/jacobyoby/ponder/issues/24). Include a reproducible case, expected behavior, and tests for the change. Data reports should identify the FDA record and the field that differs; omit private information and credentials.
