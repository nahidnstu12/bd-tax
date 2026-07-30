---
assessment_year: "2025-26"
topic: house-property
source: "NBR e-Return Income From Rent tab; config repair_allowance_pct null"
---

## How do I enter house property income on e-Return?

Enable **Income from Rent** on Assessment if you receive rental income. The Income tab
supports multiple properties via **Add Another Property**, with property type and a **Rent
Summary**. Enter the figures the portal asks for (gross rent, expenses, etc.) so the
return’s rent head matches your records.

## What does this calculator accept for house property?

The v1 calculator takes a single number: **`house_property_income` as NET income** — what
you treat as taxable house property after allowable deductions on the form. There is **no
repair-or-collection allowance percentage** in `rules/ay-2025-26/config.json` yet
(`repair_allowance_pct` is null), so the code cannot compute gross-to-net for you.

## What if I only know gross rent?

Work out net income using the official form rules or your prior return, then enter that net
figure in the calculator. When a verified repair-allowance rule is added to config, the
calculator can be extended; until then, entering gross rent will **overstate** total income
and tax.
