# Beanstalk development notes

Beanstalk queries the openFDA food enforcement API. The public app displays real records; sample records are only used by explicit development demo mode. Failed live requests can show labeled cached records or an unavailable state, never an automatic fictional fallback.

## Run locally

Use Node 22.22.2 or later in the 22.x line, or Node 26. From this directory:

```sh
npm ci
npm run dev
```

Open the address printed by Vite, normally `http://localhost:5173/`.

## Checks and builds

```sh
npm run lint
npm test
npm run build:pages
npm run preview:pages
```

The hosted build and preview use `/beanstalk/`. Output is `dist/`. The default `npm run build` and `npm run preview` target the site root. `npm run build:demo` and `npm run preview:demo` explicitly use fictional records.

## Data and credentials

The [FDA food enforcement dataset](https://open.fda.gov/apis/food/enforcement/) is updated weekly and is not intended for public alerting or real-time lifecycle tracking. Reported distribution and dietary text matches do not establish that a product is safe or suitable for a diet.

GitHub Pages calls the public FDA endpoint directly, subject to its [authentication and request limits](https://open.fda.gov/apis/authentication/). It has no private backend. Development can use Vite's proxy with a server-side `OPENFDA_API_KEY`; no owner key belongs in browser code. Hosted builds ignore environment files and public shell variables, and CI verifies exclusion of a fake key sentinel. Never commit credentials.

## Publication

The Pages workflow tests and builds pull requests without deploying them. Changes reaching `main` are built and published with source-commit metadata. See the [deployment and rollback procedure](../docs/github-pages-demo.md) for the current bootstrap state, verification, and recovery steps.
