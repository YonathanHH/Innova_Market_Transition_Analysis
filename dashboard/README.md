# Dashboard

Static React + TypeScript dashboard for the Innova wholesale dataset. No backend —
every aggregate and forecast is precomputed into `src/data/dashboard.json` and
shipped with the bundle.

## Develop

```bash
npm install
npm run dev
```

Vite serves it at http://localhost:5173/Innova_Market_Transition_Analysis/ (the
`base` path matches the GitHub Pages URL).

## Regenerate the data

Whenever the CSV changes, rebuild the payload from the repository root:

```bash
python scripts/build_dashboard_data.py
```

That script fits the SARIMA models with the same `auto_arima` settings as the
notebook, so the dashboard's forecasts and error metrics match the analysis
rather than drifting from it. Its output is committed, which is what lets the
Pages build run without a Python step.

## Build

```bash
npm run build
```

`.github/workflows/deploy-dashboard.yml` runs this on every push to `main` that
touches `dashboard/`, then publishes `dist/` to GitHub Pages. Enable it once
under **Settings → Pages → Source: GitHub Actions**.

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
