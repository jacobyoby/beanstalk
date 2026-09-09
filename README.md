# Beanstalk

FDA Food Recall Tracker — search and filter openFDA food enforcement records with provenance, dietary and state filters, and offline fallback.

## Scope
v0.1: trustworthy recall search, accessible filters, watchlist, dark mode, PWA shell.

## Runtime
Node 22.22.2 or later in the 22.x line, npm, Vite 6 + React 18 + TypeScript.

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
- Host: [Beanstalk on GitHub Pages](https://jacobyoby.github.io/beanstalk/). The Pages workflow runs `npm run build:pages` with base `/beanstalk/` and publishes changes to `main` after tests pass. Pull requests build without deploying.
- API boundary: GitHub Pages queries openFDA directly without an owner key. Local development can use a server proxy with `OPENFDA_API_KEY`; hosted builds exclude environment credentials.
- Regression gate: `npm run lint && npx tsc --noEmit && npm run test && npm run build` + manual smoke (live/empty/unavailable, combined filters, pagination truncation, drawer details, keyboard, 375/768/1280).
- Rollback: revert tag or redeploy prior `dist` artifact; history preserved in `main` and `gh-pages`.

## Docs
See [development notes](food-recall-app/README.md) and the [Pages deployment procedure](docs/github-pages-demo.md).
