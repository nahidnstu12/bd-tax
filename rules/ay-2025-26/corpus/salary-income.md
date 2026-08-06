---
assessment_year: "2025-26"
topic: salary-income
source: "Filed return E1 + NBR e-Return employment tab; 6th Schedule Part 1 (⅓ rule)"
---

<!--
  "What counts as salary income" was originally one section covering three
  separate things: what is included, multiple employers, and which figures to
  copy off the salary certificate. That made one embedding vector averaged
  across all three, and "is my festival bonus taxable?" could only reach it at
  rank 5 — the ablation confirmed it. Split, not reworded: no rule changed.
-->

## What counts as salary income on e-Return?

Employment income includes basic salary, allowances, **festival bonus**, and non-cash
benefits. All of it goes under **Income from Employment** on the portal and forms gross
salary before any exemption is applied. A festival bonus is ordinary salary income here —
the calculator applies only the one-third salary exemption below, and models no separate
exemption for bonus.

## What if I had more than one employer this year?

Multiple employers in one income year use **Add Employment** on the portal, entering each
employer as its own row; the portal can then show a combined employment summary across all
of them. The calculator takes a single gross salary figure, so add the employers together
before entering it.

## Which figures do I take from the salary certificate?

Enter **annual totals** from the employer salary certificate, not monthly amounts. The
salary certificate is the document your employer issues covering the whole income year,
and its yearly totals are what both the portal and this calculator expect under Income
from Employment.

## How is salary exemption calculated for Assessment Year 2025-26?

For salaried returns we model NBR’s **one-third exemption**: exempt amount =
**one-third of gross salary** (rounded to whole taka), subject to an **absolute cap of
4,50,000 taka** that only binds at very high salaries (cap still unverified against the
Act). **Taxable salary** = gross salary minus exempt amount. The calculator uses this rule;
allowance-by-allowance HRA caps are kept only for older year configs.

## Does exempt salary appear anywhere besides Schedule 1?

Tax-exempt salary is also a **source of fund** on the wealth statement — it is not only a
tax reduction. If you merge two employers, apply the fraction to **aggregate** gross unless
the absolute cap binds (then per-employer treatment could differ — rare at typical incomes).
