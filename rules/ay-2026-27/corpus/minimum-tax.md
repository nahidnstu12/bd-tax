---
assessment_year: "2026-27"
topic: minimum-tax
source: "config rules/ay-2026-27/config.json; video E2b"
---

## What is minimum tax for 2026-27 in this calculator?

**5,000 taka** standard floor when minimum tax applies; **1,000 taka** for first-time
filers when triggered. Policy video E2b reports the portal applies **flat 5,000** even when
the UI still asks for city corporation location. The calculator matches that flat policy.

## When is minimum tax zero?

When total income is at or below the exempt threshold, minimum tax does not apply (same
trigger model as 2025-26). Example from policy video: taxable income 4,20,000 may compute
slab tax below 5,000 but minimum tax raises payable to 5,000 **when the rule triggers**.

## First-time filer concession

Repeat filers use the 5,000 floor when minimum tax applies. First-time filers may see
1,000 instead when the minimum-tax rule is active — config flag `is_first_time_filer` on
calculator inputs.
