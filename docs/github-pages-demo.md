# Beanstalk GitHub Pages demo

Public preview: https://jacobyoby.github.io/beanstalk/

This is an interactive development demo with clearly labeled fictional records. It is not the v0.1 release and does not query FDA or require an API key. State and dietary matching remain tracked in the v0.1 milestone.

## Build from source

Use Node 22.22.2 or later in the 22.x line, or Node 26. Run from `food-recall-app/`:

```sh
npm ci
npm test
npm run build:demo
npm run preview:demo -- --host 127.0.0.1
```

Open the preview under `/beanstalk/`. The demo mode sets Vite's base, manifest scope, start URL, and service-worker scope to that project path. The output is `food-recall-app/dist/`.

Demo builds ignore environment files and public shell variables. The demo flag is supplied by build configuration. Do not add an owner API key to this frontend. The eventual live service needs the server-only boundary described in issue #22.

The artifact verifier checks all entry-point assets, manifest icons, service-worker registration, and the injected credential sentinel used by CI. Browser checks must also confirm the fictional-data banner, search, details, reload, phone layout, and zero FDA requests.

## Publish a preview

GitHub Pages is configured to serve the root of the dedicated `gh-pages` branch. That branch contains compiled files and `.nojekyll`, not application source. A preview deployment does not merge or approve the source PR.

1. Test and build the exact source revision to preview; record its commit in `build-info.json` alongside `mode: "demo"` and `fictionalData: true`.
2. Copy only `dist/` contents into a clean checkout of `gh-pages`, retain `.nojekyll`, and commit with the source revision in the message.
3. Push `gh-pages` and wait for the `pages-build-deployment` workflow to succeed.
4. Read back the public `build-info.json`, entry point, manifest, icons, and service worker. Confirm the app in a browser.

The repository About website links to the verified Pages address. Main-branch changes are not automatically published to this demo.

## Roll back

In a clean `gh-pages` checkout, revert the failed deployment commit and push the revert. Wait for Pages deployment, then read back `build-info.json` and reload the demo. This preserves deployment history. Source changes remain subject to the repository's normal review requirements.
