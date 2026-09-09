# Beanstalk

FDA Food Recall Tracker — search and filter openFDA food enforcement records with provenance, dietary and state filters, and offline fallback.

## Scope
v0.1: trustworthy recall search, accessible filters, watchlist, dark mode, PWA shell.

## Runtime
Node 22, npm 10, Vite 5 + React 18 + TypeScript.

## Build from fresh clone
```
git clone https://github.com/jacobyoby/beanstalk.git
cd beanstalk/food-recall-app
npm ci
npm test
npm run build   # output: food-recall-app/dist
```

## Release
- Version: 0.1.0 (`food-recall-app/package.json`), tag `v0.1.0`, GitHub Release with notes.
- Host: GitHub Pages (`gh-pages` branch) via `vite build` — asset base `/beanstalk/` configured when deploying to subpath; root deploy uses `/`.
- API boundary: openFDA key via server proxy (`OPENFDA_API_KEY`), never in client bundle.
- Regression gate: `npm run lint && npx tsc --noEmit && npm run test && npm run build` + manual smoke (live/empty/unavailable, combined filters, pagination truncation, drawer details, keyboard, 375/768/1280).
- Rollback: revert tag or redeploy prior `dist` artifact; history preserved in `main` and `gh-pages`.

## Docs
See `food-recall-app/README.md` for data, deployment, and env details.

## Support
[Donate / Support Jacobrakai Foundation — JACOBRAKAI FOUNDATION 501(c)(3)](https://donate.stripe.com/eVq4gy97DanS9h60phfrW00)
