---
assessment_year: "2026-27"
topic: house-property
source: "NBR e-Return Income From Rent tab; config repair_allowance_pct null"
---

## How do I report rental income for 2026-27?

Use **Income from Rent** on the e-Return wizard when you receive property income. Multiple
properties can be added separately; the portal provides a rent summary. IT-10B triggers may
apply if you own house property in a city corporation — that is separate from the income
figure used in tax computation.

## What house property figure does the calculator use?

Enter **`house_property_income` as NET** taxable rent for the income year **1 July 2025 –
30 June 2026**. Config has **no verified repair allowance percentage** (`repair_allowance_pct`
is null), same as 2025-26. The calculator adds this net amount to taxable salary (after ⅓
exemption) and other heads to get total income.

## Bank interest and rent together

House property and **Income from Financial Assets** are separate portal heads. The calculator
uses `house_property_income` and `bank_interest` as separate inputs; financial-asset income
should be **net of bank charges** when you know them (see verification notes), but house
property remains net-as-you-enter-it until a repair rule is configured.
