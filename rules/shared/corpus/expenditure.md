---
topic: expenditure
source: "NBR e-Return User Manual v1.1_25 — Expenditure tab"
source_url: https://etaxnbr.gov.bd
---

## What is the Statement of Expenses Relating to Lifestyle?

The **Expenditure** tab lists personal and family spending for the income year. Amounts
**do not reduce taxable income** on Schedule 1. They feed **wealth reconciliation** with
Assets & Liabilities: total sources of fund should cover lifestyle outflows (portal
**difference = 0**).

## How do calculator fields map to the e-Return lines?

| e-Return line | `inputs.expenditure` field |
|---|---|
| Food, clothing and other essentials | `food_clothing_essentials` |
| Housing expense | `accommodation` |
| Personal transport | `auto_transport` |
| Utility (electricity, gas, water, phone, internet) | `household_utility` |
| Education | `education` |
| Travel, vacation | `travel_vacation` |
| Festival and other special (e.g. parents' support) | `festival_special` |
| Any other lifestyle | `other_lifestyle` |
| Tax deducted at source / tax & surcharge paid (expense line) | `tax_charges_paid` |
| Interest on personal loan | `personal_loan_interest` |
| Environmental surcharge (expense line) | `environmental_surcharge` |

The calculator sums these into **`lifestyle_expense_total`**. **`source_tax`** on the tax
settlement is separate (TDS claimed on Tax & Payment); only amounts you enter on the
**expenditure** tax line belong in `tax_charges_paid`.

## Does expenditure change tax?

No. Tax still flows from income heads, slabs, rebate, and minimum tax. Expenditure only
affects **`wealth.closing_net_wealth`** and optional reconcile against
**`declared_closing_net_wealth`**.
