# Dashboard

Static React + TypeScript dashboard for the Innova wholesale dataset. No backend —
every aggregate and forecast is precomputed into `src/data/dashboard.json` and
shipped with the bundle.

## Develop

```bash
npm install
npm run dev
```

Vite serves it at http://localhost:5173/.

## Regenerate the data

Whenever the CSV changes, rebuild the payload from the repository root:

```bash
python scripts/build_dashboard_data.py
```

That script fits the SARIMA models with the same `auto_arima` settings as the
notebook — order selected on the training split, then refit on the full series —
so the dashboard's forecasts and error metrics match the analysis rather than
drifting from it. Its output is committed, which is what lets both deploy
targets build without a Python step.

## Build

```bash
npm run build      # → dist/
npm run preview    # serve dist/ locally at http://localhost:4173/
```

## Deploying

The bundle is plain static files, so anything that serves a directory works. The
only setting that differs between hosts is the **base path**, because it has to
match the URL the site is served from:

| Host | Served at | `base` |
|---|---|---|
| Vercel | domain root | `/` (the default) |
| GitHub Pages | `/<repo>/` | set via `VITE_BASE` |

`vite.config.ts` defaults to `/` and reads `VITE_BASE` when it is set, so neither
host needs a code change.

### Vercel

Import the repository, then set **Root Directory** to `dashboard`. That is the
one setting Vercel cannot infer — without it the build runs at the repo root,
finds no `package.json`, and fails.

Everything else comes from `vercel.json`: framework preset, `npm ci`, the build
command, `dist` as the output, and cache headers (fingerprinted assets immutable
for a year, `index.html` never cached). Leave the Build & Output settings in the
Vercel UI on their defaults so they do not override it.

No rewrite rule is configured, and none is needed: the dashboard is a single page
with no client-side router, so a request for a path that does not exist should
return a genuine 404 rather than silently serving the app.

### GitHub Pages

`.github/workflows/deploy-dashboard.yml` builds and publishes on every push to
`main` that touches `dashboard/`, passing `VITE_BASE=/<repo>/`. Enable it once
under **Settings → Pages → Source: GitHub Actions**.

The two targets are independent — deploying to one does not affect the other.

## Notes on the charts

Colours come from a palette validated for colour-vision deficiency and for
contrast against both the light and dark surfaces. Two constraints shaped the
layout:

- The four model/fuel series are shown as **small multiples in a single hue**
  rather than four coloured lines. A four-way categorical palette could not clear
  the all-pairs separation floor in dark mode, and facet titles carry identity
  more reliably than colour anyway.
- Every chart has a **data table** behind a toggle, and the heatmap prints its
  values in each cell, so no reading depends on colour alone.

Dark mode is a selected set of steps for the dark surface, not an inversion of
the light palette. It follows the OS setting by default and can be overridden
with the toggle.
