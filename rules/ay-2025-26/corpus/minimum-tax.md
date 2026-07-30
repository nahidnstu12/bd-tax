---
assessment_year: "2025-26"
topic: minimum-tax
source: "config rules/ay-2025-26/config.json; verification-findings F2"
---

## What is minimum tax for 2025-26 in this calculator?

When minimum tax **applies**, the tax due after rebate is at least **5,000 taka** for
repeat filers, or **1,000 taka** for **first-time filers** when the minimum-tax rule is
triggered. This project uses a **flat 5,000 nationwide** — not 3,000 / 4,000 / 5,000 by
city corporation — because policy videos and blogs disagree and no filed return has yet
shown a non-5,000 floor.

## When does minimum tax apply?

Config uses **`total_income_above_threshold`**: minimum tax is considered only when total
income exceeds the exempt threshold. A filed return below threshold showed **minimum tax
zero** even though rebate was claimed. Tax payable is the **higher of net tax after rebate
and minimum tax** when the rule triggers.

## Does the portal still ask for location?

The Additional Information screen may still ask **location of main source of income**. Some
2025-26 tutorials describe tiered minimum tax by area; a 2026-27 policy video claims flat
5,000 everywhere. Treat location as **UX-only** unless rank-1 evidence shows otherwise.
