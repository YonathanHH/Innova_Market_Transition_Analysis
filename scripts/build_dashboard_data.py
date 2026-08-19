#!/usr/bin/env python3
"""Precompute every figure the dashboard renders into a single JSON payload.

The dashboard is a static page with no backend, so all aggregation and the
SARIMA forecast happen here and ship as data. Run after any change to the CSV:

    python scripts/build_dashboard_data.py

Writes dashboard/src/data/dashboard.json. Deterministic -- the same CSV always
produces the same payload, so the output is meaningful to diff.
"""

import json
import sys
import warnings
from datetime import datetime, timezone
from itertools import product
from pathlib import Path

import numpy as np
import pandas as pd

warnings.filterwarnings("ignore")

ROOT = Path(__file__).resolve().parent.parent
CSV = ROOT / "Innova_Wholesales_Data_2017_2026.csv"
OUT = ROOT / "dashboard" / "src" / "data" / "dashboard.json"

MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
          "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"]
MONTH_NO = {m: i for i, m in enumerate(MONTHS, start=1)}

# The two series whose crossover the analysis is built around.
FOCUS = ["Reborn Diesel", "Zenix Hybrid"]
FORECAST_HORIZON = 24          # months beyond the last observation
SEASONAL_PERIOD = 12
HOLDOUT_MONTHS = 12            # backtest window, and the model-selection split

# GIIAS, Indonesia's main motor show, runs in August and reliably lifts volume.
GIIAS_MONTH = "Aug"


def load():
    df = pd.read_csv(CSV, encoding="utf-8-sig", keep_default_na=False)
    df["Month_Num"] = df["Month"].map(MONTH_NO)
    if df["Month_Num"].isna().any():
        bad = sorted(set(df.loc[df["Month_Num"].isna(), "Month"]))
        sys.exit(f"unrecognised month value(s): {bad}")
    df["Date"] = pd.to_datetime(
        dict(year=df["Year"], month=df["Month_Num"], day=1))
    df["Series"] = df["Model"] + " " + df["Fuel_Type"]
    # Reborn is the ladder-frame RWD generation, Zenix the TNGA monocoque FWD one.
    df["Chassis"] = np.where(df["Model"] == "Reborn", "Ladder Frame", "Monocoque")
    return df.sort_values("Date").reset_index(drop=True)


def monthly_by_series(df):
    """Wide monthly table: one column per series, zero-filled, no date gaps."""
    wide = (df.pivot_table(index="Date", columns="Series", values="Wholesale",
                           aggfunc="sum", fill_value=0)
              .sort_index())
    full = pd.date_range(wide.index.min(), wide.index.max(), freq="MS")
    return wide.reindex(full, fill_value=0)


def fit_sarima(ts, horizon=FORECAST_HORIZON, select_on=None):
    """Select a seasonal ARIMA and forecast `horizon` months ahead.

    Uses pmdarima's auto_arima with the same search parameters as the notebook's
    `find_best_arima`, so the dashboard and the notebook select the same models
    and report the same errors. The search bounds matter: pmdarima defaults to
    start_p/start_q=2 and start_P/start_Q=1, and starting the stepwise search
    from a different point lands on a different local optimum.

    `select_on` chooses the order on a prefix of the series (the training split)
    before refitting that order on all of `ts` -- the notebook's two-step, which
    keeps the holdout out of the model-selection decision.
    """
    from pmdarima import auto_arima
    from pmdarima.arima import ARIMA

    sel_ts = ts if select_on is None else select_on

    # Below two full cycles the seasonal search cannot identify anything.
    seasonal = len(sel_ts) >= 2 * SEASONAL_PERIOD
    try:
        model = auto_arima(
            sel_ts,
            m=SEASONAL_PERIOD if seasonal else 1,
            seasonal=seasonal,
            d=None, D=None,               # let the tests choose differencing
            start_p=0, max_p=3,
            start_q=0, max_q=3,
            start_P=0, max_P=2,
            start_Q=0, max_Q=2,
            information_criterion="aic",
            stepwise=True,
            error_action="ignore",
            suppress_warnings=True,
        )
    except Exception as exc:
        print(f"  auto_arima failed: {exc}")
        return None

    order = model.order
    seasonal_order = model.seasonal_order

    # Refit the chosen order on the full series, carrying auto_arima's
    # intercept. Going through a bare SARIMAX would silently drop it: SARIMAX
    # defaults to no constant, and for a d=0 order like (1,0,0) the forecast
    # then decays toward zero instead of reverting to the series mean.
    final = ARIMA(order=order, seasonal_order=seasonal_order,
                  with_intercept=model.with_intercept,
                  suppress_warnings=True).fit(ts)
    aic = float(final.aic())

    mean, ci = final.predict(n_periods=horizon, return_conf_int=True, alpha=0.20)
    mean = np.clip(np.asarray(mean, dtype=float), 0, None)
    ci = np.clip(np.asarray(ci, dtype=float), 0, None)      # 80% interval

    idx = pd.date_range(ts.index[-1] + pd.offsets.MonthBegin(),
                        periods=horizon, freq="MS")
    return {
        "order": list(order),
        "seasonalOrder": list(seasonal_order),
        "aic": round(aic, 2),
        "points": [
            {"date": d.strftime("%Y-%m"),
             "mean": round(float(m), 1),
             "lower": round(float(lo), 1),
             "upper": round(float(hi), 1)}
            for d, m, (lo, hi) in zip(idx, mean, ci)
        ],
    }


def backtest(ts, holdout=HOLDOUT_MONTHS):
    """Hold out the last `holdout` months and report error on them."""
    if len(ts) <= holdout + SEASONAL_PERIOD:
        return None
    train, test = ts.iloc[:-holdout], ts.iloc[-holdout:]
    fit = fit_sarima(train, horizon=holdout)
    if fit is None:
        return None

    pred = np.array([p["mean"] for p in fit["points"]])
    actual = test.to_numpy(dtype=float)
    err = pred - actual
    nz = actual != 0
    return {
        "holdoutMonths": holdout,
        "mae": round(float(np.mean(np.abs(err))), 1),
        "rmse": round(float(np.sqrt(np.mean(err ** 2))), 1),
        "mape": (round(float(np.mean(np.abs(err[nz] / actual[nz])) * 100), 1)
                 if nz.any() else None),
    }


def find_crossover(forecasts, wide):
    """When Zenix Hybrid overtakes Reborn Diesel for good, across history+forecast.

    A crossover only counts if the lead holds from that month to the end of the
    horizon. A fixed streak length cannot answer this: the two series trade the
    lead repeatedly, and the first multi-month streak is the November 2022 launch
    surge, which Reborn Diesel then took back.

    Also returns every stretch where Zenix Hybrid led, because whether those
    stretches are lengthening or shrinking is the more informative signal.
    """
    zx, rb = forecasts.get("Zenix Hybrid"), forecasts.get("Reborn Diesel")
    if not zx or not rb:
        return None

    hist_end = wide.index[-1].strftime("%Y-%m")
    z = {d.strftime("%Y-%m"): float(v) for d, v in wide["Zenix Hybrid"].items()}
    r = {d.strftime("%Y-%m"): float(v) for d, v in wide["Reborn Diesel"].items()}
    z.update({p["date"]: p["mean"] for p in zx["points"]})
    r.update({p["date"]: p["mean"] for p in rb["points"]})

    # Start once Zenix Hybrid exists; before that the zeros are not a "lead".
    zenix_from = min(p for p, v in z.items() if v > 0)
    dates = sorted(d for d in z if d in r and d >= zenix_from)
    leads = [z[d] > r[d] for d in dates]

    runs = []
    start = None
    for i, (d, ahead) in enumerate(zip(dates, leads)):
        if ahead and start is None:
            start = i
        elif not ahead and start is not None:
            runs.append((start, i - 1))
            start = None
    if start is not None:
        runs.append((start, len(dates) - 1))

    lead_runs = [{"from": dates[a], "to": dates[b], "months": b - a + 1,
                  "basis": ("forecast" if dates[a] > hist_end
                            else "actual" if dates[b] <= hist_end
                            else "actual to forecast")}
                 for a, b in runs]

    result = {"leadRuns": lead_runs, "historyEnds": hist_end}

    for i, d in enumerate(dates):
        if all(leads[i:]):
            result.update({"date": d, "withinForecast": True,
                           "inForecast": d > hist_end,
                           "zenixHybrid": z[d], "rebornDiesel": r[d]})
            return result

    last = dates[-1]
    result.update({"date": None, "withinForecast": False,
                   "lastZenixHybrid": z[last], "lastRebornDiesel": r[last],
                   "finalGap": round(r[last] - z[last], 1)})
    return result


def build():
    df = load()
    wide = monthly_by_series(df)
    series_names = list(wide.columns)

    # ---- monthly, per series + total -------------------------------------
    monthly = []
    for date, row in wide.iterrows():
        rec = {"date": date.strftime("%Y-%m"),
               "total": int(row.sum())}
        rec.update({s: int(row[s]) for s in series_names})
        monthly.append(rec)

    # ---- annual totals by fuel and by model ------------------------------
    annual = []
    for year, grp in df.groupby("Year"):
        by_fuel = grp.groupby("Fuel_Type")["Wholesale"].sum()
        by_model = grp.groupby("Model")["Wholesale"].sum()
        total = int(grp["Wholesale"].sum())
        annual.append({
            "year": int(year),
            "total": total,
            "partial": bool(year == df["Year"].max()
                            and grp["Month"].nunique() < 12),
            "byFuel": {k: int(v) for k, v in by_fuel.items()},
            "byModel": {k: int(v) for k, v in by_model.items()},
            "fuelShare": {k: round(float(v) / total * 100, 1)
                          for k, v in by_fuel.items()} if total else {},
        })

    # ---- seasonality: year x month totals --------------------------------
    heat = (df.pivot_table(index="Year", columns="Month", values="Wholesale",
                           aggfunc="sum", fill_value=0)
              .reindex(columns=MONTHS, fill_value=0))
    seasonality = {
        "months": MONTHS,
        "rows": [{"year": int(y),
                  "values": [int(heat.loc[y, m]) if m in heat.columns else 0
                             for m in MONTHS]}
                 for y in heat.index],
        # Mean units per month across complete years, used to show the GIIAS lift.
        "monthlyMean": {},
    }
    complete = [y for y in heat.index if (df[df["Year"] == y]["Month"].nunique() == 12)]
    if complete:
        sub = heat.loc[complete]
        seasonality["monthlyMean"] = {m: round(float(sub[m].mean()), 1)
                                      for m in MONTHS if m in sub.columns}
        overall = float(sub.to_numpy().mean())
        giias = float(sub[GIIAS_MONTH].mean()) if GIIAS_MONTH in sub else None
        seasonality["giiasLiftPct"] = (round((giias / overall - 1) * 100, 1)
                                       if giias and overall else None)

    # ---- forecasts for the two focus series ------------------------------
    forecasts, metrics = {}, {}
    for name in FOCUS:
        if name not in wide.columns:
            continue
        # Start each series at its first row in the source, not at 2017. The
        # zero-padded pre-launch months that follow are kept, matching the
        # notebook: they are structural rather than observed demand, but
        # dropping them leaves Zenix Hybrid too short for the seasonal search.
        first = df.loc[df["Series"] == name, "Date"].min()
        ts = wide.loc[wide.index >= first, name].astype(float)
        print(f"fitting SARIMA for {name} "
              f"({len(ts)} months from {first:%Y-%m}) ...", flush=True)
        # Order chosen on the training split, then refit on everything.
        fit = fit_sarima(ts, select_on=ts.iloc[:-HOLDOUT_MONTHS])
        if fit:
            forecasts[name] = fit
            print(f"  order={tuple(fit['order'])} "
                  f"seasonal={tuple(fit['seasonalOrder'])} AIC={fit['aic']}")
        bt = backtest(ts)
        if bt:
            metrics[name] = bt
            print(f"  backtest MAE={bt['mae']} RMSE={bt['rmse']} MAPE={bt['mape']}%")

    crossover = find_crossover(forecasts, wide)

    # ---- headline numbers ------------------------------------------------
    last_full = [a for a in annual if not a["partial"]][-1]
    payload = {
        "meta": {
            "generated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "source": "GAIKINDO monthly wholesale reports",
            "rows": int(len(df)),
            "totalUnits": int(df["Wholesale"].sum()),
            "coverage": {"from": df["Date"].min().strftime("%Y-%m"),
                         "to": df["Date"].max().strftime("%Y-%m")},
            "seriesNames": series_names,
            "forecastHorizon": FORECAST_HORIZON,
            "zenixLaunch": "2022-11",
            "lastFullYear": last_full["year"],
        },
        "kpis": {
            "totalUnits": int(df["Wholesale"].sum()),
            "lastFullYearTotal": last_full["total"],
            "lastFullYearHybridShare": last_full["fuelShare"].get("Hybrid", 0.0),
            "lastFullYearDieselShare": last_full["fuelShare"].get("Diesel", 0.0),
            "giiasLiftPct": seasonality.get("giiasLiftPct"),
        },
        "monthly": monthly,
        "annual": annual,
        "seasonality": seasonality,
        "forecasts": forecasts,
        "metrics": metrics,
        "crossover": crossover,
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    size_kb = OUT.stat().st_size / 1024
    print(f"\nwrote {OUT.relative_to(ROOT)} ({size_kb:.1f} KB)")
    print(f"  {len(monthly)} monthly points, {len(annual)} years, "
          f"{len(forecasts)} forecast series")
    if crossover and crossover.get("withinForecast"):
        print(f"  crossover: {crossover['date']} "
              f"({crossover['monthsAhead']} months out)")
    else:
        print("  crossover: not reached within the forecast horizon")


if __name__ == "__main__":
    build()
