# Phase 1 — Calculator & replay eval

**Goal:** compute tax deterministically, and prove it correct by reproducing a return you
actually filed.
**AI involved:** none.
**Status:** eval passes on filed return + synthetics; **`verified` stays false** until bands are proved — use `_verified_parts` in config.

> **This phase is the gate.** If the calculator cannot reproduce a filed return, nothing
> built on top of it is worth anything. Do not start Phase 2 until `npm run eval` passes.

---

## 1. What already exists

```
rules/ay-2025-26/config.json     figures + _verify list
rules/ay-2026-27/config.json
lib/calc/types.ts                shared types
lib/calc/config.ts               year loader
lib/calc/money.ts                round2, BDT lakh formatting
lib/calc/slabs.ts                band application
lib/calc/rebate.ts               lowest-of-three + which cap bound
lib/calc/minimumTax.ts           floor logic
lib/calc/index.ts                computeTax orchestration
eval/replay.ts                   the eval
eval/calc-cli.ts                 ad-hoc breakdown printer
private/returns/2025-26.example.json
```

Verify it runs:

```bash
npm install
npm run calc -- 2025-26
```

You should see a full breakdown for the built-in sample, ending with `[UNVERIFIED CONFIG]`
warnings. That warning is intentional and stays until you set `"verified": true`.

---

## 2. Rules are data, never code

```
rules/ay-<year>/config.json
```

The calculator takes the year as an argument and loads that file. **A new tax year is a
new folder — zero code changes.** Old years are never mutated, because the replay eval
depends on them staying fixed.

### Config anatomy

```jsonc
{
  "exempt_threshold": { "general": 375000, ... },   // per taxpayer category
  "parent_of_disabled_extra": 50000,
  "bands": [                                        // applied ABOVE the threshold
    { "width": 300000, "rate": 0.10 },
    { "width": null,   "rate": 0.30 }               // null = remainder
  ],
  "rebate": {
    "pct_of_taxable_income": 0.03,                  // lowest of these three applies
    "pct_of_investment": 0.15,
    "absolute_cap": 1000000
  },
  "minimum_tax": { "standard": 5000, "first_time_filer": 1000,
                   "applies_when": "total_income_above_threshold" },
  // salary: see verification-findings F1 — filed returns use 1/3 gross exempt, not itemized below
  "salary_exemption": { "mode": "itemized", "house_rent_pct_of_basic": 0.5,
                        "medical_annual_cap": 120000, "overall_cap": null }
}
```

**Key modelling decision:** bands are widths applied *above* the exempt threshold, not
absolute income ranges. This is what lets the same band list serve every taxpayer
category — only the threshold changes.

---

## 3. Calculation order

```
gross salary        = basic + HRA + medical + conveyance + bonus + other + non-cash
salary exemption    = min(gross × fraction, absolute_cap), rounded to whole taka   [fraction_of_gross]
                      OR itemized HRA/medical/conveyance caps (older years)
taxable salary      = gross salary − exemption
total income        = taxable salary + house property + bank interest + other
exempt threshold    = category threshold (+ parent-of-disabled extra)
taxable             = max(0, total income − threshold)
gross tax           = bands applied to `taxable`
rebate              = min(3% × total income, X% × investment, absolute cap)
tax after rebate    = max(0, gross tax − rebate)
net tax             = max(tax after rebate, minimum tax)   if triggered
payable/refundable  = net tax − source tax − advance tax
```

Every step returns a labelled line in `Breakdown`, so the UI can show the working and the
LLM can narrate it later **without recomputing anything**.

---

## 4. Ambiguities are config switches, not guesses

Three rules are genuinely unclear from available sources. Rather than picking one, each
is a switch — so the replay eval settles it empirically.

| Open item | Switch | Options |
|---|---|---|
| **V1** rebate base — "total" vs "taxable" income | `rebate.pct_of_taxable_income` applied to `total_income` | change the field the code multiplies |
| **V2** minimum tax trigger | `minimum_tax.applies_when` | `total_income_above_threshold` · `always` |
| **V4** salary exemption shape | `salary_exemption.mode` | `itemized` · `overall_cap` · **`fraction_of_gross` (AY 2025-26+ — proved E1)** |

Minimum tax **amount** is a flat **5,000** (`standard`) in both year configs — not
3,000 / 4,000 by area. Video drift is documented in verification-findings **F2**; no
`by_area` in the calculator unless a filed return proves otherwise.

If the eval fails, these switches are the **first** things to try — **except V4 on 2025-26+**, which is set to `fraction_of_gross` from filed return E1.

---

## 5. The replay eval

### Set it up

```bash
cp private/returns/2025-26.example.json private/returns/2025-26.json
```

Fill in your real figures from the filed return:

```jsonc
{
  "assessment_year": "2025-26",
  "inputs": {
    "category": "general",
    "is_parent_of_disabled": false,
    "is_first_time_filer": false,
    "salary": { "basic": 0, "house_rent_allowance": 0, "medical_allowance": 0,
                "conveyance_allowance": 0, "bonus": 0, "other_allowances": 0,
                "non_cash_benefits": 0 },
    "house_property_income": 0,   // NET
    "bank_interest": 0,
    "other_income": 0,
    "eligible_investment": 0,
    "source_tax": 0,
    "advance_tax": 0
  },
  "filed_result": {
    "gross_salary": 0,
    "salary_exemption": 0,
    "taxable_salary": 0,
    "total_income": 0,
    "gross_tax": 0,
    "rebate": 0,
    "tax_after_rebate": 0,
    "net_tax": 0,
    "minimum_tax": 0,
    "payable": 0
  }
}
```

Every key you set in `filed_result` is asserted (within 1 taka). Real returns should
include at least the income chain (`salary_exemption` … `total_income`) plus tax lines,
so a wrong exemption cannot hide behind `net_tax: 0`.

`private/` is gitignored. **This data never leaves your machine and is never embedded.**

### Run it

```bash
npm run eval
```

Pass:
```
  ✓  2025-26.json  10 line(s) within 1 taka
  1 passed.
```

Fail — lists each mismatched line, then the full working:
```
  ✗  2025-26.json  2 mismatch(es)

       ✗ total income           calc …   filed …
       ✗ net tax                calc …   filed …

       gross salary        14,10,000
       salary exemption   -4,80,000
       ...
```

`TOLERANCE` is 1 taka — rounding noise is not a failure.

---

## 6. Debugging a mismatch, in order

**Work top-down.** The first line that diverges from your filed return localises the bug.

| Diverges at | Likely cause |
|---|---|
| **total income** | an income head not modelled, or the salary exemption rule is wrong (V4) |
| **exempt threshold** | wrong `category`, or the parent-of-disabled extra applies/doesn't |
| **gross tax** | band widths or rates wrong in config |
| **rebate** | rebate base (V1), rate, or cap wrong — check `rebate_binding` in the output |
| **net tax only** | minimum tax trigger (V2) |
| **payable only** | source tax / AIT figures |

Fill `filed_result.total_income` as well as `net_tax` — the eval prints both, which makes
income-side bugs obvious immediately.

---

## 7. The payoff: this eval verifies your figures

You were blocked on "get the Finance Act to confirm the numbers." **You are not.**

- Eval **passes** on a filed return → record what each line proved in `_verified_parts`.
  Do **not** set `"verified": true` until gross tax / slabs are exercised (see
  [`verification-findings.md`](../verification-findings.md) §10).
- Eval **fails** → something specific is wrong, and section 6 tells you where to look.

A research problem became a test. That is the whole point of building Phase 1 first.

---

## 8. Acceptance criteria

- [x] `npm run calc -- 2025-26` prints a full breakdown
- [x] `npm run eval` reproduces at least one filed return within 1 taka
- [x] Synthetic fixtures for both configured years (not two filed returns)
- [x] `_verified_parts` on 2025-26; global `verified` remains false until bands proved
- [x] V4 salary exemption settled in config (⅓ gross); cap remains in `_verify`

**Phase 1 gate met for corpus/indexing work.** Finish remaining corpus files (Phase 2) before Phase 3.

---

## 9. Extending later

- **New income head** — add to `TaxInputs`, include in `total_income`, add a line to
  `Breakdown`. Nothing else changes.
- **New year** — copy the newest `rules/ay-*/` folder, edit changed figures, re-run the
  eval. **Previous years must still pass.**
- **Out-of-scope detection** — reject business income, capital gains, non-resident status
  at input validation rather than computing something wrong. Refusing is a feature.
