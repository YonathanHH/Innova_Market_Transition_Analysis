#!/usr/bin/env python3
"""Integrity checks for Innova_Wholesales_Data_2017_2026.csv.

The dataset is hand-parsed from GAIKINDO wholesale reports, so the failure mode
to guard against is transcription slips rather than pipeline bugs. Run before
every commit that touches the CSV:

    python scripts/validate_data.py

Exits non-zero if any ERROR-level check fails. WARN lines are informational and
cover known, documented properties of the source data.
"""

import csv
import sys
from collections import Counter, defaultdict
from pathlib import Path

CSV = Path(__file__).resolve().parent.parent / "Innova_Wholesales_Data_2017_2026.csv"

COLUMNS = ["Year", "Month", "Model", "Fuel_Type", "Transmission",
           "Type", "Wholesale", "Sub-Type"]
KEY = ["Year", "Month", "Model", "Fuel_Type", "Transmission", "Type", "Sub-Type"]

# "Sept" (not "Sep") is the spelling used throughout the source reports.
MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
          "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"]
MONTH_NO = {m: i for i, m in enumerate(MONTHS, start=1)}

DOMAINS = {
    "Model":        {"Reborn", "Zenix"},
    "Fuel_Type":    {"Diesel", "Gasoline", "Hybrid"},
    "Transmission": {"Automatic", "Manual"},
    "Type":         {"G", "Q", "V", "Venturer"},
    "Sub-Type":     {"N/A", "Mi", "TRD", "50t", "TSS", "Modelista",
                     "TSS + Modelista"},
}

# Combination trims must be written in one fixed order. "Modelista + TSS" was
# used for 2022 and "TSS + Modelista" from 2023 on, which split one continuous
# series in two under any groupby on Sub-Type. Normalised to the latter.
SUBTYPE_ALIASES = {"Modelista + TSS": "TSS + Modelista"}

YEAR_MIN, YEAR_MAX = 2017, 2026
LAST_PERIOD = (2026, 3)          # data ends March 2026
ZENIX_LAUNCH = (2022, 11)        # Zenix wholesale starts November 2022

# Pre-launch Zenix months are carried as explicit zeros so every 2022 spec has a
# full Jan-Dec series for time-series work. Only a nonzero value there is a bug.

# One unresolved source ambiguity, kept visible as a WARN rather than silently
# dropped. 2021 carries two full Jan-Dec runs of Reborn/Gasoline/G/'Mi' in both
# transmissions, at different volumes. They are almost certainly two variants the
# schema cannot tell apart; resolving it needs the original GAIKINDO report.
# See DATA_DICTIONARY.md ("Known issues"). Remove once the source is rechecked.
KNOWN_DUPLICATE_SPECS = {
    ("2021", "Reborn", "Gasoline", "Manual", "G", "Mi"),
    ("2021", "Reborn", "Gasoline", "Automatic", "G", "Mi"),
}

errors = []
warnings = []


def err(msg):
    errors.append(msg)


def warn(msg):
    warnings.append(msg)


def load():
    # utf-8-sig strips the BOM the source file carries on its header row.
    with CSV.open(encoding="utf-8-sig", newline="") as fh:
        reader = csv.DictReader(fh)
        if reader.fieldnames != COLUMNS:
            err("header mismatch\n  expected {}\n  found    {}".format(
                COLUMNS, reader.fieldnames))
            sys.exit(report())
        # line 1 is the header, so data rows start at 2
        return [dict(row, _line=i) for i, row in enumerate(reader, start=2)]


def check_cells(rows):
    """Every cell is present and drawn from its allowed domain."""
    for r in rows:
        for col in COLUMNS:
            if r[col] is None or r[col].strip() == "":
                err("line {}: empty value in column {!r}".format(r["_line"], col))

        for col, allowed in DOMAINS.items():
            if r[col] not in allowed:
                err("line {}: {}={!r} not in {}".format(
                    r["_line"], col, r[col], sorted(allowed)))

        if r["Month"] not in MONTH_NO:
            err("line {}: Month={!r} not in {}".format(r["_line"], r["Month"], MONTHS))

        canonical = SUBTYPE_ALIASES.get(r["Sub-Type"])
        if canonical:
            err("line {}: Sub-Type={!r} is an alias -- write it as {!r}".format(
                r["_line"], r["Sub-Type"], canonical))

        try:
            year = int(r["Year"])
            if not YEAR_MIN <= year <= YEAR_MAX:
                err("line {}: Year={} outside {}-{}".format(
                    r["_line"], year, YEAR_MIN, YEAR_MAX))
        except ValueError:
            err("line {}: Year={!r} is not an integer".format(r["_line"], r["Year"]))

        try:
            vol = int(r["Wholesale"])
            if vol < 0:
                err("line {}: Wholesale={} is negative".format(r["_line"], vol))
        except ValueError:
            err("line {}: Wholesale={!r} is not an integer".format(
                r["_line"], r["Wholesale"]))


def check_duplicate_keys(rows):
    """A spec should appear at most once per month.

    Repeats mean either a transcription slip or a variant the schema cannot
    express -- both need resolving against the source report.
    """
    seen = defaultdict(list)
    for r in rows:
        seen[tuple(r[c] for c in KEY)].append((r["_line"], r["Wholesale"]))

    known = Counter()
    for key, hits in sorted(seen.items()):
        if len(hits) < 2:
            continue
        year, _month, model, fuel, trans, vtype, sub = key
        spec = (year, model, fuel, trans, vtype, sub)
        if spec in KNOWN_DUPLICATE_SPECS:
            known[spec] += 1
            continue
        where = ", ".join("line {} (={})".format(ln, v) for ln, v in hits)
        err("duplicate key {}: {}".format(key, where))

    for spec, n in sorted(known.items()):
        warn("known unresolved duplicate: {} appears twice for {} month(s) "
             "-- see DATA_DICTIONARY.md".format("/".join(spec), n))


def check_period_bounds(rows):
    """No row may postdate the reporting window or sell before its launch.

    Pre-launch Zenix rows exist by design and are padded with zeros, so only a
    nonzero volume before November 2022 counts as an error.
    """
    for r in rows:
        try:
            period = (int(r["Year"]), MONTH_NO[r["Month"]])
        except (ValueError, KeyError):
            continue                      # already reported by check_cells
        if period > LAST_PERIOD:
            err("line {}: {} {} is past {} {}".format(
                r["_line"], r["Month"], r["Year"],
                MONTHS[LAST_PERIOD[1] - 1], LAST_PERIOD[0]))
        if (r["Model"] == "Zenix" and period < ZENIX_LAUNCH
                and r["Wholesale"].isdigit() and int(r["Wholesale"]) > 0):
            err("line {}: Zenix sold {} units in {} {}, before the {} {} "
                "launch".format(r["_line"], r["Wholesale"], r["Month"], r["Year"],
                                MONTHS[ZENIX_LAUNCH[1] - 1], ZENIX_LAUNCH[0]))


def check_blocks(rows):
    """Guard the fill-down slip that produced the three known August 2026 fixes.

    Rows are laid out as contiguous per-spec runs of consecutive months. When a
    run's first row keeps a stale field from the run above it, that run either
    spans two years or repeats a month while its neighbour comes up short. Both
    shapes are caught here.
    """
    blocks, current, prev_sig = [], [], None
    for r in rows:
        sig = (r["Model"], r["Fuel_Type"], r["Transmission"], r["Type"], r["Sub-Type"])
        if sig != prev_sig:
            if current:
                blocks.append(current)
            current, prev_sig = [], sig
        current.append(r)
    if current:
        blocks.append(current)

    for b in blocks:
        head = b[0]
        label = "{}/{}/{}/{}".format(
            head["Model"], head["Fuel_Type"], head["Transmission"], head["Type"])

        years = set(r["Year"] for r in b)
        if len(years) > 1:
            err("line {}: block {} spans years {} -- likely a stale Year on "
                "its first row".format(head["_line"], label, sorted(years)))

        repeated = [m for m, n in Counter(r["Month"] for r in b).items() if n > 1]
        if repeated:
            err("line {}: block {} ({}) repeats {} -- likely a row belonging to "
                "the next block".format(head["_line"], label, head["Year"], repeated))

        months = [MONTH_NO[r["Month"]] for r in b if r["Month"] in MONTH_NO]
        if months != sorted(months):
            err("line {}: block {} ({}) is not in month order".format(
                head["_line"], label, head["Year"]))


def check_coverage(rows):
    """Report month coverage per spec-year. Gaps are legal but worth seeing.

    2020 is expected to split 9 + 3: the 'Mi' facelift landed that October, so
    each spec runs Jan-Sept as 'N/A' and Oct-Dec as 'Mi'. Coverage is measured
    per spec across sub-types, so that split still reads as a full 12.
    """
    cover = defaultdict(set)
    for r in rows:
        spec = (r["Year"], r["Model"], r["Fuel_Type"], r["Transmission"], r["Type"])
        cover[spec].add(r["Month"])

    for spec in sorted(cover):
        year = int(spec[0])
        expected = 3 if year == 2026 else 12      # 2026 covers Jan-Mar only
        got = len(cover[spec])
        if got != expected:
            missing = [m for m in MONTHS[:expected] if m not in cover[spec]]
            warn("{}: {}/{} months, missing {}".format(
                "/".join(spec), got, expected, missing))


def summarise(rows):
    per_year = Counter()
    for r in rows:
        if r["Wholesale"].isdigit():
            per_year[r["Year"]] += int(r["Wholesale"])

    print("rows       : {}".format(len(rows)))
    print("total units: {:,}".format(sum(per_year.values())))
    print("per year   : " + "  ".join(
        "{}={:,}".format(y, per_year[y]) for y in sorted(per_year)))
    print()


def report():
    for w in warnings:
        print("WARN  {}".format(w))
    if warnings:
        print()
    for e in errors:
        print("ERROR {}".format(e))
    if errors:
        print()
        print("FAILED -- {} error(s), {} warning(s)".format(len(errors), len(warnings)))
        return 1
    print("PASSED -- 0 errors, {} warning(s)".format(len(warnings)))
    return 0


def main():
    if not CSV.exists():
        print("ERROR dataset not found at {}".format(CSV))
        return 1
    rows = load()
    summarise(rows)
    check_cells(rows)
    check_duplicate_keys(rows)
    check_period_bounds(rows)
    check_blocks(rows)
    check_coverage(rows)
    return report()


if __name__ == "__main__":
    sys.exit(main())
