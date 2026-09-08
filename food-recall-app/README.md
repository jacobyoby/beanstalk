# Beanstalk development notes

This directory contains the React application. Start with the [repository overview](../README.md) for product scope, data limitations, and the [v0.1 roadmap](https://github.com/jacobyoby/ponder/issues/24).

## Local setup

Use Node.js 22.22.2 or later in the 22.x line and npm. From this directory:

```sh
npm ci
npm run dev
```

Vite normally serves the app at [localhost:5173](http://localhost:5173). Local development currently makes direct openFDA requests without requiring a configured owner key.

## Commands

| Command | Purpose |
| --- | --- |
| `npm test` | Run the Vitest suite once. |
| `npm run test:watch` | Run tests in watch mode. |
| `npm run build` | Type-check and build the production/PWA files in `dist/`. |
| `npm run preview` | Serve the built files for local inspection. |

## Code layout

| Path | Responsibility |
| --- | --- |
| `src/App.tsx` | Application state, requests, filters, and layout. |
| `src/components/` | Search, filters, recall cards, and details. |
| `src/lib/` | FDA adapter, query construction, cache, formatting, and supporting helpers. |
| `src/hooks/` | Browser state and preference hooks. |
| `vite.config.ts` | Vite and PWA build configuration. |

The stack is React, TypeScript, Vite, Tailwind CSS, and Vitest. Existing tests are a starting point; request behavior and browser regression coverage are tracked in [the verification issue](https://github.com/jacobyoby/ponder/issues/17).

## API configuration

The source is the [openFDA food enforcement API](https://open.fda.gov/apis/food/enforcement/). Consult the [provider's authentication and limits documentation](https://open.fda.gov/apis/authentication/) instead of hardcoding quota assumptions.

Do not place an owner credential in `VITE_OPENFDA_KEY` or another `VITE_` variable: [Vite exposes those values to browser code](https://vite.dev/guide/env-and-mode). A server-only API boundary is tracked in [#22](https://github.com/jacobyoby/ponder/issues/22). Never commit credentials or include them in issues, screenshots, or fixtures.

Synthetic fixtures and cache behavior are under review. The [provenance issue](https://github.com/jacobyoby/ponder/issues/9) and [freshness issue](https://github.com/jacobyoby/ponder/issues/14) define the required distinction between live, cached, unavailable, and explicit demo data.

## Release

Run tests and the production build before proposing changes. `dist/` contains the frontend artifact; `npm run preview` is a local check, not a production host. The selected host, API boundary, asset base, smoke checks, and rollback procedure are tracked in [#19](https://github.com/jacobyoby/ponder/issues/19).
