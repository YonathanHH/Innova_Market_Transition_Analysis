# Toyota Kijang Innova Market Transition Analysis (2017–2026)
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

- Hybrid share remains steady from ~41% (2023) to ~39% (2025) within 2 years of Zenix launch
- Reborn Diesel remains at ~40% share in 2025 — the diesel segment is stable, not collapsing
- Total Innova volume *increased* post-Zenix, suggesting market expansion not cannibalization
- GIIAS (August motor show) creates a consistent annual demand spike across all years

## Requirements

```bash
pip install pandas numpy plotly statsmodels pmdarima lightgbm shap
```

## License

Dataset derived from publicly available GAIKINDO reports.
Processed data shared under **CC BY 4.0** — free to use with attribution.