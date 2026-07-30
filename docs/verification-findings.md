# Verification findings — 2026-07-30

Validating the Phase 1 calculator against **real evidence** for the first time.

Two new sources arrived: a filed AY 2025-26 return, and notes from an NBR e-Return
video tutorial. This document records what they proved, what they refuted, what they
could not settle, and the changes proposed as a result.

**Code changes below are still pending** unless noted. **F1 (salary ⅓ exempt)** and **F9 (whole-taka rounding)** — implemented 2026-07-30; `sample-real-2025-26.json` replay passes. **F2 (minimum tax policy)** —
documentation and config notes updated 2026-07-30; calculator unchanged (already flat 5,000).

---

## 1. Provenance ranking

The whole project rests on being able to say where a number came from. New evidence
does not automatically win — it wins according to its rank.

| Rank | Source | Why | Used here as |
|---|---|---|---|
| **1** | **A filed, accepted return** | NBR computed and accepted these figures | `E1` |
| 2 | NBR official user manual | Authoritative on process; thin on arithmetic | `E3` |
| 3 | Video tutorial notes | Correct in outline, demonstrably lossy in digits | `E2a`, `E2b`, `E2c` |
| 4 | Commentary blogs | No provenance chain at all | `E4` |

Only the Finance Act itself would outrank `E1`, and only for figures a single return
does not exercise.

**The rule this document follows:** a lower-ranked source may not overturn a
higher-ranked one, and no source may overturn *nothing* — an unexplained figure is
discarded, not averaged in.

### The evidence

| Ref | Source | Location |
|---|---|---|
| `E1` | Filed return, AY 2025-26, filed 2025-11-14. Two employers merged. | `private/returns/sample-real-2025-26.json` (gitignored) |
| `E2a` | NBR e-Return video — salaried filing walkthrough (AY 2025-26) | [`research/video-guide-ay-2025-26-salary.md`](research/video-guide-ay-2025-26-salary.md) |
| `E2b` | NBR e-Return video — policy / portal updates (AY 2026-27) | [`research/video-guide-ay-2026-27-policy-updates.md`](research/video-guide-ay-2026-27-policy-updates.md) |
| `E2c` | NBR e-Return video — zero-tax return, remittance/tuition (AY 2026-27) | [`research/video-guide-ay-2026-27-zero-return.md`](research/video-guide-ay-2026-27-zero-return.md) |
| `E3` | NBR e-Return User Manual v1.1 | [`research/etax-filing-guide.md`](research/etax-filing-guide.md) |
| `E4` | Blog commentary | [`research/sources-2026-07-29.md`](research/sources-2026-07-29.md) |

`E1` contains no identifiers — no TIN, no name, no employer, no account numbers. Only
figures. It is gitignored and is never embedded or sent to a hosted model.

---

## 2. Findings at a glance

| # | Finding | Evidence | Status | Action |
|---|---|---|---|---|
| F1 | Salary exemption is **1/3 of gross salary**, not itemised | E1 + E2a, both exact | **REFUTES the model** | **done** — `fraction_of_gross` |
| F2 | Minimum tax **zones** (5k / 4k / 3k) vs **flat 5k** | E2a vs E2b + S1 | **DRIFT — not modeled** | docs only; keep `standard: 5000` |
| F3 | `rebate.pct_of_investment = 0.15` for AY 2025-26 | E1, exact | **CONFIRMED** | none |
| F4 | Rebate is the lowest of three legs | E1 + E2a | **CONFIRMED** | none |
| F5 | Minimum tax does not apply below the threshold | E1 | **CONFIRMED** | none |
| F6 | Tax payable = `max(net tax, minimum tax)` | E1 + E2a | **CONFIRMED** | none |
| F7 | Net-wealth surcharge still exists (answers V6) | E1 line 17(a) | **CONFIRMED** | docs |
| F8 | Settlement omits surcharge, penalty, refund adjustment | E1 lines 17/18/22 | **GAP** | docs, defer code |
| F9 | NBR reports whole taka; we carry 2 decimals | E1 | **GAP** | **done** — `roundTaka()` on form lines |
| F10 | Financial-asset income is **net of bank charges** | E2a | **GAP** | docs |
| F11 | E2a's gross tax figure does not reconcile | E2a | **REJECTED** | none — deliberately |
| F12 | Slab rates remain wholly unverified | — | **OPEN** | needs a return with tax > 0 |
| F13 | `first_time_filer: 1000` has no supporting source | — | **OPEN** | flag only |
| F14 | 1/3 on aggregate vs per-employer | E1 | **SAFE, with a caveat** | docs |
| F15 | V1 rebate base (total vs taxable income) | — | **STILL OPEN** | flag only |

---

## 2.1 Calculator vs evidence — by assessment year

Quick alignment check after splitting video notes per AY ([`research/video-guide.md`](research/video-guide.md)).
**Code changes still pending** for F1 unless noted.

| Topic | AY 2025-26 | AY 2026-27 |
|---|---|---|
| Income year | 2024-07-01 → 2025-06-30 ✓ (E3) | 2025-07-01 → 2026-06-30 ✓ (E2b) |
| Exempt threshold (general) | 375,000 ✓ bounded by E1 | 400,000 ✓ vs E2b / blogs |
| Slab band shape | Same as blogs; **bands unverified** (E1 tax 0) | Same vs E2b examples; **no filed return** |
| Rebate investment % | **15%** ✓ E1 | **10%** ✓ E2b / config |
| Rebate cap | 1,000,000 ✓ S1 / config | 750,000 ✓ E2b / config |
| Minimum tax floor | **Flat 5,000** (project policy, F2) | **Flat 5,000** (F2; matches E2b) |
| Salary exemption | **Implemented** — `fraction_of_gross` (F1) | Same (copied forward) |
| Filing-quarter rebate rule | — | E2b only; `_filing_rebate_quarters` in config, **not in calc** |

---

## 3. F1 — the salary exemption rule is wrong

### The evidence

From `E1`, Schedule 1:

```
item 13  Total Salary Received                 5,10,017
item 14  Exempted Amount (Part 1, 6th Sched)   1,70,006
item 15  Total Income from Salary              3,40,011
```

```
5,10,017 ÷ 3 = 1,70,005.67  →  1,70,006      exact
5,10,017 − 1,70,006 = 3,40,011                exact, matches item 15
```

From `E2a`, an unrelated taxpayer:

```
777,000 ÷ 3 = 259,000                          exact
777,000 − 259,000 = 518,000                    exact, matches "taxable 2/3"
```

Two unrelated taxpayers, both exact. The form even names the rule:
*"Exempted Amount (as per Part 1 of 6th Schedule)"*, and `E2a` states it in words —
*"1/3 of salary exempt, 2/3 taxable."*

### Why the current model cannot produce it

`config.salary_exemption.mode` offers `itemized` and `overall_cap`. Neither works:

- **`itemized`** needs an HRA / medical / conveyance breakdown. The return does not
  collect one — Schedule 1 has a single `Allowances` line (2,63,148). There is no
  split to apply caps to.
- **`overall_cap`** caps the sum of those same allowances. Wrong base entirely: the
  real rule is a fraction of **total** salary, bonuses and perquisites included.

This was tracked as open item **V4** — "itemised vs an overall cap". Both options were
wrong. The question was not ambiguous; it was mis-framed.

### Measured failure

Running `E1` through the calculator as it stands today:

```
✗  sample-real-2025-26.json  net_tax  ->  8,101.70   expected 0   diff +8,101.70

   gross salary        5,10,017
   salary exemption   -0                 ← no itemised allowances to match
   taxable salary      5,10,017
   total income        5,10,017
     (filed)           3,40,011          ← breaks at the very first step
   exempt threshold   -3,75,000
   taxable            = 1,35,017
     next 300,000  @ 10%  on 1,35,017  = 13,501.70
   gross tax           13,501.70
   rebate             -5,400  (bound by: investment)
   net tax             8,101.70
```

A taxpayer who owed **nothing** and was due a 2,085 refund is told to pay 8,102.

### The fix, verified by hand

```
exemption   = min(5,10,017 × 1/3, 4,50,000) = 1,70,005.67
total income = 3,40,011.33                     < 3,75,000 threshold
gross tax   = 0                                ✓ matches item 12
rebate      = min(3% × 3,40,011 = 10,200, 15% × 36,000 = 5,400, 10,00,000)
            = 5,400                            ✓ matches item 13
net tax     = max(0, 0 − 5,400) = 0            ✓ matches item 14
minimum tax = not triggered (below threshold)  ✓ matches item 15
refundable  = 2,085 − 0 = 2,085                ✓ matches item 25
```

Every line of the return reproduces.

### The cap is NOT verified

`absolute_cap: 450000` binds only above a gross salary of 13,50,000. `E1` is at
5,10,017 and `E2a` at 7,77,000 — **neither exercises it.** The cap value comes from
`E4`-grade commentary and must stay in `_verify`.

### Proposed shape

```jsonc
"salary_exemption": {
  "mode": "fraction_of_gross",
  "fraction": { "numerator": 1, "denominator": 3 },
  "absolute_cap": 450000,          // UNVERIFIED — binds only above 13,50,000 salary

  // retained, unused by this mode — pre-2023 years genuinely worked this way
  "house_rent_pct_of_basic": null,
  "medical_annual_cap": null,
  "conveyance_annual_cap": null,
  "overall_cap": null
}
```

**Express the fraction as `1/3`, never as `0.3333`.** A decimal gives 1,70,005.33
against the filed 1,70,006 — inside the 1-taka tolerance today, but it drifts with
salary and will produce false failures on larger returns.

**Keep the `itemized` branch in the code.** Pre-2023 assessment years really did work
that way. Deleting it would break the project's core promise that an old year's config
never changes behaviour.

---

## 4. F2 — minimum tax: video drift, calculator policy

Two rank-3 videos disagree:

| Source | Claim |
|---|---|
| **E2a** ([`video-guide-ay-2025-26-salary.md`](research/video-guide-ay-2025-26-salary.md)) | **5,000 / 4,000 / 3,000** by filing zone (Dhaka & Chattogram CC / other CC / elsewhere) |
| **E2b** ([`video-guide-ay-2026-27-policy-updates.md`](research/video-guide-ay-2026-27-policy-updates.md)) | UI still asks location but portal applies **flat 5,000** nationwide for 2026-27 |
| **E4 / S1** ([`sources-2026-07-29.md`](research/sources-2026-07-29.md) §3.4) | **Flat 5,000** for AY 2025-26 commentary |

`E1` does not resolve this: income was below the exempt threshold, so minimum tax was **0**
and no floor amount was exercised.

### Project decision (2026-07-30)

**Do not add location-based minimum tax in code or config.** Keep a single
`minimum_tax.standard: 5000` (and `first_time_filer: 1000` when triggered) for **both**
assessment years in the calculator.

Rationale:

- Aligns with **E2b**, blog **S1**, and current `rules/ay-*` shape.
- Avoids modeling **E2a** zone tiers on rank-3 evidence alone while **E2b** contradicts them for the current cycle.
- If a filed return later shows 3,000 or 4,000 for an outside-CC filer, revisit with rank-1 evidence — do not pre-empt with `by_area`.

Document the conflict in [`research/video-guide.md`](research/video-guide.md) (drift table). **No** `TaxInputs.area`, **no** `minimum_tax.by_area` schema.

---

## 5. F11 — why E2a's tax figure is discarded

`E2a` states a pre-rebate tax of **15,278** on a taxable income of **552,202**. Our
rules give:

```
552,202 − 375,000 threshold = 177,202  @ 10%  =  17,720.20
E2a states                                     =  15,278
                                          gap =   2,442.20
```

No threshold in either config, and no separate treatment of the financial-asset
income, reproduces 15,278.

### The reason it is discarded rather than investigated

`E2a` contains a **proven** transcription error:

```
stated:  "Gross interest 3,477 − fees 575 = 34,202"     does not compute
actual:   34,777 − 575 = 34,202                          exact
```

A digit was dropped. And everything *downstream* of the tax figure is internally
consistent to the taka:

```
15,278 − 3,150 rebate = 12,128     ✓
max(12,128, 5,000 min tax) = 12,128 ✓
12,420 paid − 12,128 = 292 refund   ✓
```

So the noise sits upstream, in exactly the region 15,278 occupies. The rebate is also
consistent with our lowest-of-three model — `min(3% × 552,202 = 16,566, 15% × 21,000 =
3,150, cap)` = 3,150, bound by the investment leg.

**Conclusion: leave the slab rates untouched.** Changing a verified-adjacent rule on a
figure from a demonstrably lossy transcript is precisely the failure this project's
provenance rule exists to prevent. One unexplained number is not evidence.

---

## 6. Confirmed — no action needed

| # | What | Proof |
|---|---|---|
| F3 | `pct_of_investment: 0.15` (AY 2025-26) | `E1`: 5,400 = 15% × 36,000, exact |
| F4 | Rebate = lowest of three legs | `E1` and `E2a` both bound on the investment leg; our code already produced 5,400 with `binding: "investment"` |
| F5 | Minimum tax gated by the threshold | `E1`: income 3,40,011 < 3,75,000, form shows minimum tax 0 |
| F6 | `payable = max(net, minimum)` | `E1` item 16 is literally *"Higher of 14 and 15"*; `applyMinimumTax` already does this |

`E1` also reconciles its own wealth statement exactly, which is a useful check that the
figures were transcribed correctly:

```
3,40,011 taxable + 1,70,006 exempt      = 5,10,017 source of fund
        + 39,999 prior net wealth       = 5,50,016
        − 3,49,000 expenses             = 2,01,016 closing net wealth   ✓
```

Note that **tax-exempt income is a source of fund** — the 1/3 exemption is not merely a
tax reduction, it is tracked in the wealth statement. `Breakdown.salary_exemption`
already holds that figure, should an IT-10B feature ever be wanted.

---

## 7. Gaps that are not yet bugs

### F7 — net-wealth surcharge exists (answers V6)

`E1` carries lines 17(a) net wealth surcharge, 17(b) tobacco, 17(c) environmental.
`sources-2026-07-29.md` open item **V6** asked whether the net-wealth surcharge had
been abolished, since no blog mentioned it. It has not. Close V6 as answered.

Not implementing it: `E1`'s net wealth is 2,01,016, orders of magnitude below any
surcharge threshold. Recording the answer is enough.

### F8 — the settlement chain is incomplete

`E1` computes its refund as `line 24 − line 19`, where line 19 = tax payable **+
surcharge (17) + delay interest/penalty (18)`, and line 24 includes **adjustment of
prior-year refund (22)**.

We compute `net_tax − (source_tax + advance_tax)`. Every missing term is 0 on `E1`, so
nothing is wrong today — but the structure is incomplete, and a filer with a penalty
or a carried-forward refund would get a wrong `payable`.

**Deferred deliberately.** Adding three pass-through fields is cheap; adding surcharge
*computation* is scope creep. Revisit when a return needs it.

### F9 — rounding

NBR works in whole taka. We carry two decimals, which is why the failure output reads
`8,101.70`. Cosmetic today because `E1`'s tax was 0, but it will cause off-by-one
diffs against any return with non-zero tax.

`E1` gives one data point on direction: `1,70,005.67 → 1,70,006`, i.e. round to
nearest, not truncate. **One data point is not a rule** — the 1-taka tolerance in the
replay eval absorbs the difference either way, so adopt round-to-nearest and note that
truncation has not been excluded.

### F10 — financial-asset income is net of charges

`E2a` enters `34,777 gross − 575 bank charges = 34,202`. `TaxInputs.bank_interest`
carries no such guidance, so a user entering the gross figure overstates income.

Also a naming gap: NBR's head is **"Income from Financial Assets"** — bank interest,
dividend, securities profit, Sanchayapatra profit. Our field name is narrower than the
head it stands for. Documentation fix; renaming is not worth a breaking change yet.

### F14 — aggregate vs per-employer

`E1` merged two employers and took 1/3 of the aggregate. Because 1/3 is linear,
merging is mathematically identical to per-employer treatment — **unless the 450,000
cap binds**, where per-employer would allow up to 2 × 450,000 of exemption.

So merging is safe at these income levels and unsafe above 13,50,000. A note, not code.

---

## 8. What remains unverified

| Open item | Status after this round | What would close it |
|---|---|---|
| **Slab rates and band widths** | **Wholly unverified.** `E1` had gross tax 0; `E2a` rejected | A filed return with **non-zero line 12 (Gross Tax)** |
| Exempt threshold 3,75,000 | Only bounded — proven above 3,40,011 | Same |
| V1 — rebate base, total vs taxable income | Untouched. Both `E1` and `E2a` bound on the investment leg, where the base is irrelevant | A return where the 3% leg binds, i.e. low investment relative to income |
| `salary_exemption.absolute_cap: 450000` | Unverified | A return with salary above 13,50,000 |
| Minimum tax by area (3k/4k/5k) | **Not modeled** — flat 5k policy; E2a vs E2b drift | Filed return from outside a CC showing non-5k floor |
| F13 — `first_time_filer: 1000` | No source at all now | Manual or Act |

**The single most valuable next artefact is a filed return with tax actually payable.**
`E1` proves the exemption and rebate legs but never touches a tax band — the largest
body of untested rules in the project. Your prior-year return would do it if income was
above the threshold that year.

---

## 9. Proposed changes

Nothing below has been applied.

### Tier 1 — backed by the filed return

| # | File | Change |
|---|---|---|
| F1 | `lib/calc/types.ts` | **Done** — `fraction_of_gross`, `fraction`, `absolute_cap` |
| F1 | `lib/calc/index.ts` | **Done** — `min(gross × n/d, cap)` + `roundTaka` on exemption |
| F1 | `rules/ay-2025-26/config.json` | **Done** |
| F1 | `rules/ay-2026-27/config.json` | **Done** |
| — | `eval/replay.ts` | Assert every key in `filed_result` — **done 2026-07-30** |
| F9 | `lib/calc/money.ts` | **Done** — `roundTaka()` on rebate, slabs, settlement |
| F7 | `research/sources-2026-07-29.md` | **Done** — V6 closed (surcharge line exists; computation out of scope) |

### Tier 2 — documentation only, zero behaviour change

| # | File | Change |
|---|---|---|
| F10, F14 | `phases/01-calculator.md` | V4 is resolved, not a switch. Bank interest is net of charges. Note the aggregate/cap caveat |
| F8 | `planning-and-architecture.md` | **Done** — settlement / surcharge out of scope note |
| — | `docs/README.md`, `README.md` | Link this document; update Phase 1 status |
| F2 | `research/video-guide.md`, per-AY video notes, both configs, `etax-filing-guide.md` | **Done 2026-07-30** — flat 5k policy; no `by_area` |

### Explicitly not doing

- **Minimum tax by area (`by_area`, location input)** — see F2. Flat **5,000** unless rank-1 evidence says otherwise.
- **Slab rates** — see F11. No evidence.
- **Surcharge computation** — F8. Structure noted, computation is scope creep.
- **Renaming `bank_interest`** — F10. Documentation is enough for now.
- **Setting `verified: true`** — see below.

---

## 10. On the `verified` flag

`E1` proves the exemption and rebate legs of AY 2025-26. It never exercises a tax band.
Flipping `"verified": true` would assert more than the evidence supports, which is
exactly what the flag exists to prevent.

**Proposal: keep `verified: false` and record what is proved, part by part.**

```jsonc
"verified": false,
"_verified_parts": {
  "salary_exemption":       "PROVED — replay of a filed AY 2025-26 return",
  "rebate.pct_of_investment": "PROVED — 5,400 = 15% x 36,000, exact",
  "rebate.lowest_of_three": "PROVED — investment leg bound",
  "minimum_tax.applies_when": "PARTIAL — below-threshold branch only",
  "exempt_threshold":       "BOUNDED — proved above 3,40,011 only",
  "bands":                  "UNVERIFIED — no return with non-zero gross tax"
}
```

A binary flag was too coarse for the evidence that actually arrives. This costs
nothing and makes the next gap obvious at a glance.

---

## 11. What this round demonstrated

The replay eval did the job it exists for. One real return overturned a modelling
assumption that two blog sources, an official manual and a plausible-looking
implementation had all failed to catch — and it did so on the very first line of the
calculation, with the diff printed and localised.

It also demonstrated the inverse discipline: `E2a` offered a tax figure that would have
prompted a change to the slab rates, and the correct response was to **reject it**,
because a source that drops a digit in one place has not earned the right to overturn a
rule anywhere else.

Evidence is ranked, and unexplained numbers are discarded rather than accommodated.
That is the difference between a calculator that is trusted and one that merely
looks right.
