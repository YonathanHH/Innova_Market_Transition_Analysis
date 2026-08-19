# Data Dictionary — `Innova_Wholesales_Data_2017_2026.csv`

Toyota Kijang Innova wholesale volumes for Indonesia, hand-parsed from GAIKINDO
monthly reports.

| | |
|---|---|
| **Rows** | 1,437 (excluding header) |
| **Coverage** | January 2017 – March 2026 |
| **Total units** | 505,239 |
| **Source** | [GAIKINDO](https://www.gaikindo.or.id) monthly wholesale reports |
| **Parsed by** | Yonathan Hary Hutagalung |
| **Licence** | CC BY 4.0 |

Validate any change with:

```bash
python scripts/validate_data.py
```

## File format

Three properties will bite you if you assume otherwise:

- **UTF-8 with BOM.** The header row starts with `\xef\xbb\xbf`. Read it as
  `utf-8-sig`, or your first column will be named `﻿Year` instead of `Year`.
- **CRLF line endings** throughout, including the final line.
- **`N/A` is a literal string**, not an empty cell and not a null. Pandas will
  coerce it to `NaN` unless you pass `keep_default_na=False`.

```python
df = pd.read_csv(
    "Innova_Wholesales_Data_2017_2026.csv",
    encoding="utf-8-sig",
    keep_default_na=False,   # keep "N/A" as the string it is
)
```

## Columns

| # | Column | Type | Values | Notes |
|---|---|---|---|---|
| 1 | `Year` | int | 2017–2026 | 2026 covers Jan–Mar only |
| 2 | `Month` | str | `Jan` `Feb` `Mar` `Apr` `May` `Jun` `Jul` `Aug` `Sept` `Oct` `Nov` `Dec` | **`Sept`, not `Sep`** — four letters, as printed in the source |
| 3 | `Model` | str | `Reborn` `Zenix` | Generation, not nameplate |
| 4 | `Fuel_Type` | str | `Gasoline` `Diesel` `Hybrid` | |
| 5 | `Transmission` | str | `Manual` `Automatic` | |
| 6 | `Type` | str | `G` `Q` `V` `Venturer` | Trim grade; `Venturer` is Reborn-only |
| 7 | `Wholesale` | int | 0–3,105 | Units shipped manufacturer → dealer |
| 8 | `Sub-Type` | str | see below | Variant qualifier; `N/A` when none |

### `Model`

| Value | Generation | Platform | Fuels | Trims | Period |
|---|---|---|---|---|---|
| `Reborn` | Innova Reborn | Ladder frame, RWD | Gasoline, Diesel | G, Q, V, Venturer | 2017 – 2026 |
| `Zenix` | Innova Zenix | TNGA monocoque, FWD | Gasoline, Hybrid | G, Q, V | Nov 2022 – 2026 |

The two coexist from November 2022 onward — this overlap is the subject of the
analysis, not an error.

### `Sub-Type`

| Value | Meaning | First appears | Rows |
|---|---|---|---|
| `N/A` | No sub-variant | 2017 Jan | 873 |
| `Mi` | Minor change (facelift) | 2020 Oct | 420 |
| `TRD` | TRD Sportivo | 2020 Jan | 48 |
| `50t` | 50th Anniversary edition | 2021 Jan | 12 |
| `Modelista` | Modelista body kit | 2022 Jan | 24 |
| `TSS` | Toyota Safety Sense | 2023 Jan | 12 |
| `TSS + Modelista` | Both packages | 2022 Jan | 48 |

Combination trims are written in one fixed order, `TSS + Modelista`. The 2022
rows originally read `Modelista + TSS`, which split one continuous series in two
under any `groupby("Sub-Type")`; they were normalised (see *Changelog*).

## Reading the layout

Rows are grouped into **contiguous per-spec blocks**, each running consecutive
months in calendar order for one combination of Model / Fuel_Type / Transmission
/ Type / Sub-Type. Most blocks are a full 12 months.

This layout is worth knowing because it is what makes transcription slips
visible: a block whose first row carries a stale field from the block above it
shows up as a block spanning two years, or as a block repeating a month while its
neighbour comes up one short. `scripts/validate_data.py` checks for exactly these
shapes.

### Expected structural quirks

These are properties of the source data, not defects:

- **2020 splits 9 + 3.** The `Mi` facelift arrived in October 2020, so each spec
  runs Jan–Sept as `N/A` and Oct–Dec as `Mi`. Blocks of 9 and 3 rows in 2020 are
  correct.
- **Zenix 2022 is zero-padded.** Jan–Oct 2022 Zenix rows exist with
  `Wholesale = 0` so every 2022 spec carries a full Jan–Dec series. Real volume
  starts in November 2022. There are 191 zero rows overall.
- **2026 is partial**, covering January through March only.

## Known issues

### Unresolved: duplicate 2021 blocks

`Reborn / Gasoline / G / Mi` appears **twice for all twelve months of 2021** in
both transmissions — 24 rows at
[lines 746–757 and 770–781](Innova_Wholesales_Data_2017_2026.csv#L746) (Manual)
and [lines 758–769 and 782–793](Innova_Wholesales_Data_2017_2026.csv#L758)
(Automatic), at different volumes.

The two runs are almost certainly distinct variants that the current eight-column
schema cannot tell apart. Resolving it requires rechecking the original GAIKINDO
report and, most likely, adding a column to carry the distinction.

**Until then**, annual and monthly totals are correct — the rows sum properly —
but the pair cannot be attributed to specific variants, and `groupby` on the full
key will collapse two real series into one. The validator reports this as a WARN
rather than an ERROR so it stays visible without failing the build.

## Changelog

### 2026-08-19 — data integrity pass

Four corrections, all verified against block structure and surrounding value
ranges. Annual totals for 2017 and 2018 change; the file total does not.

| Line | Column | Was | Now | Evidence |
|---|---|---|---|---|
| 194 | `Year` | `2017` | `2018` | Only block in the file spanning two years; the block continues `2018,Feb` … `2018,Dec`, and 2017 already has a complete Jan–Dec run for this spec |
| 458 | `Fuel_Type` | `Gasoline` | `Diesel` | Heads a Diesel block running Feb–Dec; value 720 sits inside the Diesel-V range (235–1,254) and far outside Gasoline-V (165–412) |
| 1310 | `Type` | `G` | `V` | Heads a V block running Feb–Dec; the Hybrid-G block above it is already a complete Jan–Dec |
| 12 rows | `Sub-Type` | `Modelista + TSS` | `TSS + Modelista` | Same spec as the 2023–2025 rows, differing only in word order |

All three single-field errors are the same class: the first row of a block kept
one stale field from the block above — a fill-down slip.

**Effect on annual totals:** 2017 62,588 → 61,775 (−813); 2018 58,877 → 59,690
(+813). Both reflect the same misdated January figure. All other years unchanged.
