# bd-tax — one filer, one year, end to end

Every number in this document was computed by `lib/calc` against the real
`rules/ay-*/config.json` files. Nothing here is illustrative-only.

It is **November 2026**. The AY 2026-27 deadline is 30 November. You filed
AY 2025-26 last year, and that return is already sitting in
`private/returns/2025-26.json`.

---

## The user stories

| # | As a… | I want… | So that… | phase |
|---|---|---|---|---|
| 1 | salaried filer | to ask whether a specific payment is taxable | I stop guessing from Facebook posts | 4 |
| 2 | filer | to see my tax with the full working | I can check it rather than trust it | 5 |
| 3 | filer | my certificate turned into a draft I confirm | I don't retype 30 numbers and typo one | 7 |
| 4 | filer | to know if more DPS is worth it **before** I commit money | I don't spend 60,000 to save 6,000 unknowingly | 7 |
| 5 | filer | a checklist mapped to the portal's tabs | I don't discover a missing field at 11pm on the 30th | 7 |
| 6 | maintainer | proof that the calculator matches NBR | a code change can't silently break my tax | 1 + 6 |
| 7 | returning filer | next year to cost two hours, not a weekend | I actually keep using this | 6 |

---

## Your situation

```
Basic pay                800,000        House property (net)   180,000
House rent allowance     400,000        Bank interest          110,400
Medical allowance         80,000        Other income            60,000
Bonus                    130,000
                       ─────────        DPS + insurance        300,000
Gross salary           1,410,000        Tax deducted at source  10,000
```

General category, not a first-time filer.

---

## Act 1 — A question (Ask tab)

> **"Is my festival bonus taxable?"**

```
search("is my festival bonus taxable?", year 2026-27)

  0.847  salary-income.md   What counts as salary income
  0.791  salary-income.md   Non-cash benefits
  0.643  thresholds.md      Tax-free threshold
  ...
  gate: floor 0.5 ✓   coherence 3/5 same file ✓   → answer
```

> Festival bonus is treated as salary income and is fully taxable — it is not
> covered by any allowance exemption. **[salary-income.md]**

You click the citation and read the rule yourself. That is the point: the model
did not know this, **it was handed the paragraph.**

Two questions that go differently:

| you ask | what happens |
|---|---|
| "what is the corporate tax rate?" | retrieves `out-of-scope.md` at rank 1 → **model answers with a refusal, citing why it's not covered** |
| "best biryani in Dhaka" | top score 0.392, below the floor → **gate refuses, the model is never called** |

Two refusals, two different paths. The first can explain itself; the second costs
nothing.

---

## Act 2 — The estimate (Calculate tab)

You type the figures in. No AI involved in any of this:

```
Gross salary                              14,10,000
Salary exemption (1/3, capped 4,50,000)  − 4,50,000
Taxable salary                             9,60,000
House property + interest + other        + 3,50,400
                                         ───────────
Total income                              13,10,400
Tax-free threshold (general)             − 4,00,000
Taxable above threshold                    9,10,400

  next 3,00,000  @ 10%      300,000  →   30,000
  next 4,00,000  @ 15%      400,000  →   60,000
  next 5,00,000  @ 20%      210,400  →   42,080
                                         ───────────
Gross tax                                  1,32,080
Investment rebate                         −  30,000     ← bound by INVESTMENT
Net tax                                    1,02,080
Tax already deducted                      −  10,000
                                         ───────────
PAYABLE                                      92,080
```

⚠ Two warnings show above it, both from the calculator itself:

- rule figures for AY 2026-27 are **UNVERIFIED**
- house property is taken as **net** — no repair-allowance rule is configured

Below the table, the narration:

> Your total income is 13,10,400. The first 4,00,000 is tax-free because you are
> in the general category. Tax on the rest came to 1,32,080 across three slabs.
> **Your rebate of 30,000 was limited by your investment amount — investing more
> would increase it.** After the 10,000 already deducted, you owe 92,080.

The bolded sentence is a **template**, not model prose — it comes from
`rebate_binding: 'investment'`. And `verify()` checked every number in that
paragraph against the breakdown before you saw it. On one draft the model wrote
*"roughly 7% of your income"* — a figure that appears nowhere in the JSON. It was
caught and the answer regenerated.

---

## Act 3 — The draft (My Return tab)

Calculate was a what-if. This is the real return, and it remembers.

You paste your salary certificate text into the intake box. A **local** model —
no hosted path exists in that file — proposes:

```
basic                   800,000   "Basic Pay ............ 8,00,000"      [confirm]
house rent allowance    400,000   "House Rent Allowance . 4,00,000"      [confirm]
medical allowance        80,000   "Medical Allowance ....   80,000"      [confirm]
bonus                   130,000   "Festival Bonus (x2) ..  1,30,000"     [confirm]

gross salary          1,410,000   ✗ dropped — not printed in the document
source tax               10,000   ✗ dropped — proposed as 0, no line found
```

The two dropped rows are the guard working. The certificate lists the parts but
never a total, so the model **added them up** — and the verbatim check threw it
out before you saw it. The second is subtler: an absent value is not zero, and a
confident `0` is a claim.

You confirm four fields with four clicks. Each one now remembers where it came
from. You type the source tax yourself from the tax certificate; it is marked
`user-entered`, not `extracted`.

**The checklist**, generated from the portal field map:

```
✓ Salary            confirmed · evidence: salary-certificate.pdf
✓ Source tax        typed by you · evidence: tax-certificate.pdf
✗ Bank interest     missing        → Income tab › Financial assets
✗ House property    missing        → Income tab › Rent
! Source tax        verify on the portal before filing
```

---

## Act 4 — The decision

Your bank is pushing a DPS. Is another 60,000 a year worth it?

```
                        current        + 60,000 DPS
  eligible investment    300,000            360,000
  rebate                  30,000             36,000
  net tax               1,02,080             96,080
                       ─────────────────────────────
  tax saved                                   6,000
  extra outlay                               60,000
```

**The outlay column is never hidden.** You save 6,000 by spending 60,000 — a 10%
return in tax terms, which may or may not beat what else you'd do with the money.
That is your call, made with both numbers visible.

Then the genuinely useful part, and it is pure arithmetic:

> Your rebate is currently limited by **investment**, at 10% of what you put in.
> It stops helping at 3,93,120 invested, where the 3%-of-income cap takes over at
> 39,312. You have **93,120 of headroom**; beyond that, additional investment
> changes nothing.

No model decided that. `computeTax()` did, and the corpus citation next to it
lets you check the rule.

---

## Act 5 — Filing

The app does not file. You open the NBR portal and type, tab by tab, from the
checklist. Then:

1. NBR confirms. Its number: **92,080 payable.**
2. You transcribe it by hand into `private/returns/2026-27.json` — the app never
   writes this file
3. `npm run eval`

```
  ✓ 2025-26.json  net_tax →   97,768   expected   97,768
  ✓ 2026-27.json  net_tax → 1,02,080   expected 1,02,080

  retrieval   27/30 hit · 6/6 refuse
  citations   0.94 precision   baseline 0.92
  narration   0.1 viol/100     baseline 0.10
```

**Your calculator is now proven against the government, twice.** If it had
disagreed, that would have been the single most valuable output this project can
produce — a real bug in your tax logic, found before it cost you anything.

---

## Act 6 — The thing you'd never have noticed

Same salary, same investment, two years:

```
                          AY 2025-26     AY 2026-27
  tax-free threshold        375,000        400,000     ↑ 25,000  better
  rebate on investment          15%            10%     ↓         worse
  rebate ceiling          1,000,000        750,000     ↓         worse
                        ─────────────────────────────
  rebate received            39,312         30,000
  NET TAX                    97,768      1,02,080     ↑ 4,312
```

**The threshold went up and your tax went up.** The rebate rate cut costs you
more than the higher threshold saves — 4,312 more on an identical income.

`scripts/config-diff.ts 2025-26 2026-27` produced the top half of that table in
20 lines of code and no AI whatsoever. It is the most useful page in the app.

---

## Act 7 — The compound question (optional, Phase 8)

Acts 1-6 need no agent. This is what one adds:

> **"Will I pay more next year on the same salary?"**

Ask can't compute. Calculate can't look things up. So the agent decides what to
call:

```
1  computeTax(confirmed draft, 2025-26)   → net_tax   97,768
2  computeTax(confirmed draft, 2026-27)   → net_tax 1,02,080
3  configDiff(2025-26, 2026-27)           → threshold ↑, rebate 15% → 10%
4  search("investment rebate limit")      → rebate.md (0.81)

"Yes — 4,312 more. The threshold rose 25,000, but the rebate on investment fell
 from 15% to 10%, and that costs you more than the threshold saves. [rebate.md]"
```

Four tool calls, one answer, and **the model computed nothing.** The trace is
shown to you, because the risk with an agent is that it chose badly — and you
can only check that if you can see what it chose.

---

## What each phase contributed

| phase | what it did in this story |
|---|---|
| 1 | every number above, and the replay proof in Act 5 |
| 2 | the corpus that Act 1 cited |
| 3 | retrieval that found `salary-income.md` and not the rate table |
| 4 | the citation, and both refusals — one before the model, one from it |
| 5 | the breakdown table, and `verify()` catching "roughly 7%" |
| 6 | `config-diff`, the two-year table, and the eval that made Act 5 a proof |
| 7 | the draft, the dropped total, the checklist, the DPS decision |
| 8 | optional — Act 7 only |

---

## What it refused to do

- compute your tax from a chat message
- claim a rebate without a rule and a value you supplied
- tell you to spend more to save tax without showing the outlay
- treat lifestyle expenditure as a deduction
- write `filed_result` — that comes from NBR, transcribed by hand
- submit anything
- send your income to a hosted provider

---

## The cost, honestly

| | year 1 | year 2 |
|---|---|---|
| collect and confirm | ~40 min | ~15 min, the draft is prefilled |
| decisions | ~15 min | ~5 min |
| type into the portal | ~30 min | ~30 min, unchanged — this app never files |
| after filing | ~5 min | ~5 min |

Year one is **not** faster than filling in the form yourself. The friction in Act
3 is deliberate. What you get instead is: the numbers are checked, the evidence
trail exists, and every year after this one starts from a filled-in draft with a
calculator that has been proven against NBR twice.
