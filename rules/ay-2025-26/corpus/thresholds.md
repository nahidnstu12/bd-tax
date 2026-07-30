---
assessment_year: "2025-26"
topic: thresholds
source: "Commentary blogs S1 — verify against Finance Act; bounded by filed return E1"
---

## What is the tax-free threshold for a general taxpayer in 2025-26?

The general **exempt threshold** is **3,75,000 taka** of total income. No slab tax applies
until total income exceeds that amount (plus any category adjustment). A filed AY 2025-26
return with total income **3,40,011** showed **zero gross tax**, which is consistent with
staying below 3,75,000 but does not pin the exact threshold digit.

## What thresholds apply for other categories?

Higher thresholds apply for female or senior 65+, person with disability, third gender,
and gazetted freedom fighter — see `rules/ay-2025-26/config.json` for figures (blog-sourced,
unverified). An extra **50,000 taka** may apply when claiming benefit as parent or legal
guardian of a person with disability (`parent_of_disabled_extra` in config).

## How do slabs relate to the threshold?

Slab **widths** apply to income **above** the exempt threshold, not from zero. The same
band list serves every category; only the threshold changes. Slab **rates** in config match
commentary sources but are **not yet proved** by a filed return with non-zero gross tax.
