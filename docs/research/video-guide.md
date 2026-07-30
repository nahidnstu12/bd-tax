# NBR e-Return — Video research index

Rank-3 sources (RM Konsa tutorials). **Not source of truth for numbers** — use Finance Act, NBR manual, and filed returns first. See [`verification-findings.md`](../verification-findings.md) §1.

**Portal:** https://etaxnbr.gov.bd

---

## Versions (keep separate)

| Doc | AY | What it is | Best for |
|-----|-----|------------|----------|
| [`video-guide-ay-2025-26-salary.md`](video-guide-ay-2025-26-salary.md) | **2025-26** | Full **wizard walkthrough** — employment, bank interest, assets, TDS claim, worked demo | UX, field names, reconciling with `sample-real-2025-26.json` |
| [`video-guide-ay-2026-27-policy-updates.md`](video-guide-ay-2026-27-policy-updates.md) | **2026-27** | **Rule & portal changes** — slabs, rebate, filing quarters, minimum tax | Year selector, config drift, “what changed” narration |
| [`video-guide-ay-2026-27-zero-return.md`](video-guide-ay-2026-27-zero-return.md) | **2026-27** | **Zero-tax return** — student / homemaker / taxable &lt; 400k, remittance + tuition + salary demo | Sub-threshold filing, exempt remittance UX, wealth reconcile with tax 0 |

Add new clips as **new files** (`video-guide-ay-YYYY-YY-<topic>.md`); extend the drift table below instead of overwriting an older AY note.

---

## Drift & comparison (video vs video vs repo)

Use this to tune `rules/*/config.json` and to know what still needs rank-1/2 evidence.

| Topic | 2025-26 salary video | 2026-27 policy video | `ay-2025-26` config | `ay-2026-27` config | Blog sources (S1/S3) | Status |
|--------|----------------------|----------------------|---------------------|---------------------|----------------------|--------|
| General exempt threshold | (demo uses 1/3 salary, not slab) | **400,000** | 375,000 | **400,000** | S1 / S3 | Policy + blogs aligned for 26-27 |
| Slab bands after exempt | — | 300k/400k/500k/2M @ 10–25%, rest 30% | same shape | same | S1 / S3 | Aligned |
| Rebate investment % | **15%** in demo (3,150) | **10%** | 0.15 | **0.10** | S1 / S3 | **Drift by design (YoY)** |
| Rebate absolute cap | — | **750,000** | 1,000,000 | **750,000** | S1 / S3 | Aligned |
| Rebate 3% leg base | — | unchanged 3% | V1 open | V1 open | total vs taxable | **Open (V1)** |
| Minimum tax zones | **5k / 4k / 3k** by area (E2a) | **5k flat** (UI still asks location) | standard 5000 | standard 5000 + policy note | S1 flat 5k | **Repo: flat 5k both AYs** — E2a tiers documented, not implemented ([F2](../verification-findings.md#4-f2--minimum-tax-video-drift-calculator-policy)) |
| First-time min tax | — | **1,000** when triggered | 1000 | 1000 | S3 | Aligned |
| Filing quarters → rebate | not mentioned | Jul–Sep yes; Oct–Dec no | — | `_filing_rebate_quarters` | not in blogs | **Unverified** |
| Employment 1/3 exempt | **259k / 518k** demo | not covered | **fraction_of_gross** (E1) | same | S1 allowances | **Implemented** — replay E1 |
| Salary walkthrough numbers | 552,202 taxable, 12,128 net | not covered | replay target | — | — | F11 digit loss on some lines |
| Zero-tax / &lt;400k taxable | — | threshold **400k** | — | 400k exempt | S3 | [`zero-return` video](video-guide-ay-2026-27-zero-return.md) |
| Foreign remittance | not focus | fully exempt head | — | — | — | E2c UX |
| Tuition as other income | — | Other Source → any other | — | — | — | E2c UX |
| Taxable demo total | — | **300k** (200k salary + 100k tuition) | — | slab 0 | — | Eval candidate |

**How to resolve drift:** add evidence to the registry (below) → update [`verification-findings.md`](../verification-findings.md) → then `config.json` / calc code.

---

## Evidence registry (extend as you find sources)

| ID | Type | AY | Feeds | Location |
|----|------|-----|-------|----------|
| E1 | Filed return | 2025-26 | exemption, rebate, bands indirect | `private/returns/sample-real-2025-26.json` |
| E2a | Video | 2025-26 | UX, min tax zones, salary demo | [`video-guide-ay-2025-26-salary.md`](video-guide-ay-2025-26-salary.md) |
| E2b | Video | 2026-27 | slabs, rebate YoY, quarters, min tax | [`video-guide-ay-2026-27-policy-updates.md`](video-guide-ay-2026-27-policy-updates.md) |
| E2c | Video | 2026-27 | zero-tax filing, remittance, tuition, &lt;400k taxable | [`video-guide-ay-2026-27-zero-return.md`](video-guide-ay-2026-27-zero-return.md) |
| E3 | NBR manual | 2025-26 UX | process, rebate categories | [`etax-filing-guide.md`](etax-filing-guide.md) |
| E4 | Blogs | 25-26 & 26-27 | numeric prior before Act | [`sources-2026-07-29.md`](sources-2026-07-29.md) |
| *E5* | *Finance Act / circular* | *26-27* | *quarters, min tax flat* | *not in repo yet* |
| *E6* | *Filed return* | *26-27* | *confirm portal min tax* | *not in repo yet* |

---

## Related repo files

| File | Role |
|------|------|
| `rules/ay-2025-26/config.json` | Calculator inputs for prior AY |
| `rules/ay-2026-27/config.json` | Calculator inputs for current AY; `_portal_note`, `_filing_rebate_quarters` |
| `docs/verification-findings.md` | What to change after new evidence |
| `eval/replay.ts` | Replay returns against calc |

---

## AI prompt: pick the right doc

```
For Bangladesh e-Return UX and 2025-26 salaried example numbers, use video-guide-ay-2025-26-salary.md. For 2026-27 slab/rebate/min-tax/quarter changes, use video-guide-ay-2026-27-policy-updates.md. For 2026-27 zero-tax returns (taxable under 400000, remittance/tuition/student/homemaker), use video-guide-ay-2026-27-zero-return.md. For authoritative process, etax-filing-guide.md. For calculator numbers, rules/ay-{year}/config.json after verification. Minimum tax: calculator uses flat 5000 for all areas and both configured years; E2a zone tiers are drift only — see verification-findings.md F2.
```

---

## Glossary (shared)

| Term | Meaning |
|------|---------|
| Assessment year | e.g. 2026-27; income year usually previous Jul–Jun |
| Drift | Same topic, different values across sources/years |
| Lowest-of-three rebate | min(income %, investment %, absolute cap) |
