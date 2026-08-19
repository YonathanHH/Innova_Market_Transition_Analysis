# Toyota Kijang Innova Market Transition Analysis (2017–2026)
<img width="708" height="368" alt="innova" src="https://github.com/user-attachments/assets/ab49b7fe-0d68-4937-a5e9-73385479ba49" />

### From Diesel Ladder-Frame Dominance to Hybrid Monocoque Adoption

![Toyota Innova](https://img.shields.io/badge/Market-Indonesia-red)
![Data Source](https://img.shields.io/badge/Source-GAIKINDO-blue)
![Period](https://img.shields.io/badge/Period-2017--2026-green)

## Overview

This project analyzes the market transition of Toyota Kijang Innova in Indonesia
using official GAIKINDO wholesale data from 2017 to March 2026. It covers the
coexistence of two generations — the Innova Reborn (ladder frame RWD, diesel/gasoline)
and the Innova Zenix (TNGA monocoque FWD, gasoline/hybrid) — launched in November 2022.

## Questions Addressed

- How fast is the Indonesian market shifting from diesel to hybrid?
- How did consumers react to the platform change from RWD ladder frame to FWD monocoque?
- When will Zenix Hybrid wholesale permanently surpass Reborn Diesel?

## Dataset

**Innova_Wholesales_Data_2017_2026.csv**

**Source:** GAIKINDO (Gabungan Industri Kendaraan Bermotor Indonesia)
— publicly available at [gaikindo.or.id](https://www.gaikindo.or.id)

**Processed by:** Yonathan Hary Hutagalung

1,437 rows covering January 2017 – March 2026, 505,239 units total.
See **[DATA_DICTIONARY.md](DATA_DICTIONARY.md)** for the full column reference,
file-format gotchas (UTF-8 BOM, CRLF, `N/A` as a literal string), and the
changelog.

## Data Quality

The dataset is hand-parsed from GAIKINDO reports, so it ships with an automated
integrity check:

```bash
python scripts/validate_data.py
```

It verifies the schema and value domains, rejects duplicate spec-months and
out-of-window dates, and checks the per-spec block layout for the fill-down slips
that hand transcription tends to produce. Run it before committing any change to
the CSV; it exits non-zero on failure.

One known ambiguity remains open — two duplicate 2021 blocks that need the
original report to resolve. It is reported as a warning and documented under
[Known issues](DATA_DICTIONARY.md#known-issues).

## Notebook Structure

| Cell | Content |
|---|---|
| 1 | Business Understanding & Problem Statement |
| 2 | Library Importing |
| 3 | Data Understanding & Feature Engineering |
| 4 | Exploratory Data Analysis (10 Plotly charts) |
| 5 | Time-Series Data Preparation |
| 6 | SARIMA Modelling + Crossover Detection |
| 7 | Cost-Benefit Analysis + SHAP |
| 8 | Conclusion & Business Recommendation |

## Key Findings

- **The transition is gasoline-to-everything, not diesel-to-hybrid.** Gasoline
  fell from 30.0% of volume in 2023 to 11.0% in 2025. Diesel and hybrid split the
  ground it gave up.
- Hybrid share held steady at ~41% (2023) → ~39% (2025) in the two years after the
  Zenix launch — it did not take share from diesel.
- Diesel share nearly doubled over the same period, 28.3% → 49.9%. The diesel
  segment is not merely stable; it is growing.
- Total Innova volume *increased* post-Zenix, suggesting market expansion rather
  than cannibalization.
- GIIAS (the August motor show) lifts volume ~9.7% above the average month, the
  one reliable seasonal feature in the series.
- **Zenix Hybrid's lead is fading, not building.** It has outsold Reborn Diesel
  in six separate stretches since launch, and those stretches are getting
  shorter: 12 months → 4 → 5 → 2 → 2 → 2. The two trade the lead rather than
  crossing over once.
- **No permanent crossover within 24 months.** Requiring the lead to hold to the
  end of the horizon, neither SARIMA model produces one; Reborn Diesel finishes
  ~231 units/month ahead. The forecast intervals are wide enough that the honest
  reading is "undetermined," not "distant."

## Running the Analysis

Python 3.10–3.12 (pmdarima has no wheels for 3.13 yet).

```bash
pip install -r requirements.txt
```

Then launch the notebook from the repository root:

```bash
jupyter notebook Innova_transition_Full_Analysis.ipynb
```

The notebook resolves the dataset relative to the working directory, so it runs
from a clone as well as on Colab — no path editing needed. It writes two
intermediates, `Innova_Wholesales_Enriched.csv` and
`Innova_TimeSeries_Prepared.csv`, both gitignored and rebuilt on every run.

## Interactive Dashboard

A static React + TypeScript dashboard covering the fuel-mix transition, the
Reborn Diesel vs Zenix Hybrid head-to-head with its forecast band, per-series
trajectories, and seasonality.

```bash
python scripts/build_dashboard_data.py   # regenerate data after a CSV change
cd dashboard && npm install && npm run dev
```

Its SARIMA models use the same `auto_arima` settings as the notebook, so the
figures on the dashboard match the analysis. Pushing to `main` publishes it to
GitHub Pages — see [dashboard/README.md](dashboard/README.md) for details and
the one-time Pages setup.

## Kaggle Link

[Toyota Innova Wholesale Sales Indonesia(2017-2026)](https://www.kaggle.com/datasets/yonathanhary/toyota-innova-wholesale-sales-indonesia2017-2026/)

## License

Dataset derived from publicly available GAIKINDO reports.
Processed data shared under **CC BY 4.0** — free to use with attribution.
