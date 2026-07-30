---
assessment_year: "2025-26"
topic: slabs
source: "rules/ay-2025-26/config.json — UNVERIFIED bands; no filed return with gross tax > 0"
---

## How is income taxed above the exempt threshold in 2025-26?

After total income exceeds your **exempt threshold** (see thresholds corpus), tax applies
in **bands** on the excess only — not from the first taka of income. The calculator loads
band **widths** and **rates** from config. Amounts are rounded to **whole taka** on each
band and on the total gross tax line, matching NBR form style.

## What are the slab bands and rates for 2025-26?

On income above the threshold, in order:

1. **Next 3,00,000 taka** at **10%**
2. **Next 4,00,000 taka** at **15%**
3. **Next 5,00,000 taka** at **20%**
4. **Next 20,00,000 taka** at **25%**
5. **Remainder** at **30%**

These figures come from commentary blogs in the research notes, **not** from a filed return
that paid slab tax. Treat them as the working model until replay proves otherwise.

## How does the calculator apply bands?

Slabs use **widths above threshold**, not absolute income ranges. Example: general taxpayer,
total income 11,70,000, threshold 3,75,000 → **8,05,000** taxed in bands (3L @ 10%, 4L @
15%, 1.05L @ 20%). Rebate and minimum tax run **after** gross tax. If corpus prose and
config disagree, **config wins** for numbers.
