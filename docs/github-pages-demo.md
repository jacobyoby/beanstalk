# Hosting Beanstalk on GitHub Pages

App: https://jacobyoby.github.io/beanstalk/

Beanstalk is an evolving application that queries the openFDA food enforcement API. The public app loads real records, with source and cache states shown in the interface. This dataset is updated weekly; it is not a real-time safety alert service. Fictional fixtures remain available only through explicit demo mode for development.

## Build the hosted app

Use Node 22.22.2 or later in the 22.x line, or Node 26. From `food-recall-app/`:

```sh
npm ci
npm run lint
npm test
npm run build:pages
npm run preview:pages -- --host 127.0.0.1
```

Open `/beanstalk/` on the preview address. The output is `food-recall-app/dist/`. Vite, manifest icons, start URL, scope, and service-worker registration use the project path.

Hosted builds ignore environment files and public shell variables, so an owner credential cannot accidentally enter the browser bundle. The app currently uses unauthenticated openFDA requests and is subject to the provider's public limits. Issue #22 tracks a server-only credential boundary for higher-volume use; GitHub Pages does not supply a private backend.

`npm run build:demo` and `npm run preview:demo` provide an explicitly fictional development build. They are not the commands for the hosted app.

## Continuous deployment

The `Beanstalk Pages` workflow tests and builds pull requests. Only a push or manual workflow run on `main` can publish. Every deployment includes `build-info.json` with the source commit and data mode. Branch protection continues to control which changes reach main.

For workflow deployment, GitHub Pages must use **GitHub Actions** as its source and the `github-pages` environment must permit `main`. Until the hosting PR is merged and this handover is enabled, Pages serves the manually published compiled artifact on `gh-pages`. Do not describe the continuous workflow as active until its first deployment succeeds.

For a manual publication, test and build a clean source revision, copy only `dist/` into a clean `gh-pages` checkout, retain `.nojekyll`, and record the source revision in `build-info.json` with `mode: "pages"` and `fictionalData: false`. Commit and push the artifact, then wait for Pages deployment.

## Verify and roll back

Read back the public build-info, entry point, manifest, icons, and service worker. Browser checks must confirm real records, a source link, search, empty/error states, refresh, and no forced fictional banner. Compare a displayed record to its provider response.

For workflow deployment, revert the faulty source change on main through normal review; the next successful workflow publishes the correction. For the manual `gh-pages` phase, revert the faulty artifact commit and push the revert. Verify the served source revision after either rollback.
