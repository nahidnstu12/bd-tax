# NBR e-Return — Portal field map (all video sources)

**Purpose:** Exhaustive field inventory for later **IT-11GA / API / calc mapping**.  
**Baseline (official):** `E3` = [`etax-filing-guide.md`](etax-filing-guide.md) (NBR manual v1.1)  
**Videos:** `V1` = [`video-guide-ay-2025-26-salary.md`](video-guide-ay-2025-26-salary.md) (`E2a`) · `V2` = [`video-guide-ay-2026-27-policy-updates.md`](video-guide-ay-2026-27-policy-updates.md) (`E2b`) · `V3` = [`video-guide-ay-2026-27-zero-return.md`](video-guide-ay-2026-27-zero-return.md) (`E2c`)  
**Filed:** `E1` = `private/returns/sample-real-2025-26.json` (figures only, AY 2025-26)

**Coverage legend:** `●` demo / step shown · `○` mentioned · `—` not in source · `▸` manual only (no video)

Wizard tab order: **Assessment → Income → Rebate → Expenditure → Assets & Liabilities → Tax & Payment → Return View**

---

## 0. Pre-wizard & account

| `field_id` | Portal label (EN) | Type | E3 | V1 | V2 | V3 |
|------------|-------------------|------|----|----|----|-----|
| `access.landing.tiles` | eTIN / eReturn / ReturnVerify / eReturnLedger / eTaxPayment / eTaxService | nav | ▸ | — | — | — |
| `access.register.tin` | TIN | text | ▸ | — | — | ○ |
| `access.register.mobile` | Biometric-verified mobile | text | ▸ | — | — | ● |
| `access.register.captcha` | Captcha | text | ▸ | — | — | — |
| `access.register.otp` | OTP | text | ▸ | — | — | — |
| `access.register.password` | Password + confirm | secret | ▸ | — | — | — |
| `access.signin.tin` | TIN | text | ▸ | ● | — | ● |
| `access.signin.password` | Password | secret | ▸ | ● | — | ● |
| `access.signin.captcha` | Captcha | text | ▸ | — | — | — |
| `access.menu.submission` | Home → Submission | nav | ▸ | ● | ○ | ● |
| `access.menu.regular_ereturn` | Regular e-Return | nav | ▸ | ● | ○ | ● |

---

## 1. Assessment — page 1 (assessment information)

| `field_id` | Portal label (EN) | Type | E3 | V1 | V2 | V3 |
|------------|-------------------|------|----|----|----|-----|
| `assessment.scheme` | Return Scheme (e.g. Self) | select | ▸ | ● | — | ● |
| `assessment.year` | Assessment Year | fixed | ▸ | ● 2025-26 | ● 2026-27 | ● 2026-27 |
| `assessment.income_year_from` | Income Year start | date | ▸ | ● 2024-07-01 | — | ● 2025-07-01 |
| `assessment.income_year_to` | Income Year end | date | ▸ | ● 2025-06-30 | — | ● 2026-06-30 |
| `assessment.income_year_partial` | Custom start month if mid-year job | date/month | — | ● (e.g. Oct) | — | — |
| `assessment.residential_status` | Resident / Non Resident | enum | ▸ | ● Resident | — | ● Resident |
| `assessment.tax_exempted_income_flag` | Tax Exempted Income (yes/no) | bool | ▸ | ● No (salary) | — | ● Yes (remittance demo) |

### Heads of income (checkboxes)

| `field_id` | Portal label (EN) | E3 | V1 | V2 | V3 |
|------------|-------------------|----|----|----|-----|
| `assessment.head.employment` | Income from Employment | ▸ | ● | — | ● |
| `assessment.head.rent` | Income from Rent | ▸ | ○ | — | — |
| `assessment.head.agriculture` | Income from Agriculture | ▸ | ○ | — | — |
| `assessment.head.business` | Income from Business | ▸ | ○ | — | — |
| `assessment.head.capital_gain` | Capital Gains | ▸ | ○ | — | — |
| `assessment.head.financial_asset` | Income from Financial Assets | ▸ | ● | — | ○ (sanchay profit) |
| `assessment.head.other_source` | Income from Other Sources | ▸ | ○ | — | ● (tuition) |
| `assessment.head.voluntary_disclosure` | Voluntary Disclosure (7th schedule) | ▸ | ○ skip | — | — |
| `assessment.head.partner_firm` | As Partner of a Firm | ▸ | — | — | — |
| `assessment.head.aop` | As Member of an AoP | ▸ | — | — | — |
| `assessment.head.foreign_outside_bd` | Income outside Bangladesh | ▸ | — | — | — |
| `assessment.head.spouse_minor` | Spouse / minor children (not assessed separately) | ▸ | — | — | — |

### Tax-exempt sub-head (when flag = Yes)

| `field_id` | Portal label (EN) | E3 | V1 | V2 | V3 |
|------------|-------------------|----|----|----|-----|
| `assessment.exempt.foreign_remittance` | Foreign remittance (tax exempt) | — | — | — | ● |
| `assessment.exempt.other` | Other fully exempt heads (portal list) | — | ○ remittance ref | — | ● |

**V3 note:** If **Tax Exempted Income = No**, video says income heads may not appear until you still declare support; if **Yes**, remittance path opens on Income tab.

`assessment.actions.save_continue` · `assessment.actions.save_draft` — all sources that walk wizard: ●

---

## 2. Assessment — additional information

| `field_id` | Portal label (EN) | Type | E3 | V1 | V2 | V3 |
|------------|-------------------|------|----|----|----|-----|
| `assessment.addl.location_main_source` | Location of Main Source of Income | enum | ▸ | ● Dhaka South CC | ● (still in UI; min tax test) | ● N/S/CC/other |
| `assessment.addl.freedom_fighter` | War-wounded Gazetted Freedom Fighter | bool | ▸ | — | — | ○ |
| `assessment.addl.disability_third_gender` | Person with Disability / third gender | bool | ▸ | — | — | ○ |
| `assessment.addl.parent_disabled` | Parent/guardian of disabled (benefit) | bool | ▸ | — | — | ○ |
| `assessment.addl.claim_tax_rebate` | Claim tax rebate for investment? | bool | ▸ | ● Yes | — | ● No |
| `assessment.addl.voluntary_disclosure` | Voluntary disclosure (7th schedule) | bool | ▸ | ○ skip | — | — |

### IT-10B / ITNBB triggers (E3 naming)

| `field_id` | Portal label (EN) | E3 | V1 | V2 | V3 |
|------------|-------------------|----|----|----|-----|
| `assessment.it10b.gross_wealth_50l` | Gross wealth over 50,00,000? | ▸ | ● | — | ○ |
| `assessment.it10b.motor_car` | Own motor car? | ▸ | ● | — | ● |
| `assessment.it10b.offshore_property` | Own offshore property? | ▸ | ● office prop | — | ● foreign property |
| `assessment.it10b.shareholder_director` | Shareholder / director of company? | ▸ | ● | — | ● |
| `assessment.it10b.house_city_corp` | House property in city corporation? | ▸ | ● house | — | ● |
| `assessment.it10b.submit_optional` | ITNBB not mandatory — still submit? | — | ● Yes | — | ● Yes (unlocks assets) |

---

## 3. Income — employment

| `field_id` | Portal label (EN) | Type | E3 | V1 | V2 | V3 |
|------------|-------------------|------|----|----|----|-----|
| `income.employment.add` | Add Employment | action | ▸ | ● multi employer | — | — |
| `income.employment.type` | Employment Type (Private / Government / IBS++) | enum | ▸ | ● Private | — | ● Private (+ govt path ○) |
| `income.employment.employer_name` | Employer Name | text | ▸ | ● ABC Co | — | ● demo |
| `income.employment.designation` | Designation | text | ▸ | ● Manager | — | ● |
| `income.employment.shareholder_director` | Shareholder Director ☐ | bool | ▸ | — | — | — |
| `income.employment.basic_salary` | Basic Salary (income-year **total**) | money | ▸ | ● | — | ● |
| `income.employment.house_rent` | House Rent Allowance | money | ▸ | ● | — | ● |
| `income.employment.medical` | Medical Allowance | money | ▸ | ● | — | ● |
| `income.employment.conveyance` | Conveyance Allowance | money | ▸ | ● | — | ● |
| `income.employment.festival_bonus` | Festival Bonus (year total) | money | ▸ | ● | — | ● |
| `income.employment.provident_fund` | Provident Fund (employee) | money | ▸ | ○ none | — | — |
| `income.employment.other_line_add` | Add — other salary components | repeater | ▸ | ○ | — | ● |
| `income.employment.other_if_any_detail` | Other if any — give detail (purpose + amount) | text+money | — | — | — | ● |
| `income.employment.non_cash.rent_free_accom` | Rent-free accommodation | bool | ▸ | — | — | — |
| `income.employment.non_cash.concessional_accom` | Concessional accommodation | bool | ▸ | — | — | — |
| `income.employment.non_cash.vehicle` | Vehicle facility | bool | ▸ | — | — | — |
| `income.employment.non_cash.other` | Other non-cash benefit | bool | ▸ | — | — | — |
| `income.employment.summary.total_regular` | Employment Summary — total regular income | computed | ▸ | ● 777,000 | — | ● 406,000 |
| `income.employment.summary.exempt_portion` | Summary — exempt / tax-free slice | computed | ▸ | ● 259,000 | — | ● 135,000 |
| `income.employment.summary.taxable` | Summary — taxable employment | computed | ▸ | ● 518,000 | — | ● 200,000 |
| `income.employment.actions.save_draft` | Save Draft | action | ▸ | ● | — | — |

---

## 4. Income — financial assets (interest / FDR / etc.)

| `field_id` | Portal label (EN) | Type | E3 | V1 | V2 | V3 |
|------------|-------------------|------|----|----|----|-----|
| `income.finasset.add` | Add account / instrument | action | ▸ | ● | — | ○ |
| `income.finasset.bank_name` | Bank name | text | ▸ | ● City Bank | — | — |
| `income.finasset.branch` | Branch | text | ▸ | ● Gulshan | — | — |
| `income.finasset.account_number` | Account number | text | ▸ | ● | — | — |
| `income.finasset.account_name` | Account name | text | ▸ | — | — | — |
| `income.finasset.product_type` | FDR / term deposit / savings | enum | ▸ | ● term | — | — |
| `income.finasset.gross_interest` | Gross interest / profit | money | ▸ | ● 3,477 | — | — |
| `income.finasset.expense_fees` | Bank charges / maintenance | money | ▸ | ● 575 | — | — |
| `income.finasset.tds` | TDS deducted | money | ▸ | ● 347 | — | — |
| `income.finasset.statement_balance` | Balance at year-end (30 Jun) | money | ▸ | ● 346,000 | — | — |
| `income.finasset.net_income` | Net income (after expenses) | computed | ▸ | ● 34,202 | — | — |
| `income.finasset.sanchaypatra_profit` | Sanchaypatra profit (separate entry) | — | — | — | — | ○ → enable head on Assessment |

---

## 5. Income — other sources

| `field_id` | Portal label (EN) | Type | E3 | V1 | V2 | V3 |
|------------|-------------------|------|----|----|----|-----|
| `income.other.type` | Income type / Any other income | enum | ▸ | — | — | ● |
| `income.other.particular` | Particular (e.g. Tuition) | text | — | — | — | ● |
| `income.other.payment_authority` | Payment authority (e.g. parents) | text | — | — | — | ● |
| `income.other.payment_date` | Payment date(s) | date | — | — | — | ● |
| `income.other.gross` | Gross amount (year) | money | — | — | — | ● 120,000 |
| `income.other.expense` | Related expenses | money | — | — | — | ● 20,000 |
| `income.other.net` | Net income | computed | — | — | — | ● 100,000 |

---

## 6. Income — tax exempt (foreign remittance) — V3

| `field_id` | Portal label (EN) | Type | E3 | V1 | V2 | V3 |
|------------|-------------------|------|----|----|----|-----|
| `income.exempt.remittance_amount` | Remittance amount (income year) | money | — | — | — | ● 600,000 |
| `income.exempt.country` | Country of origin | text | — | — | — | ● |
| `income.exempt.source_abroad` | Source abroad (salary / business) | enum/text | — | — | — | ● |
| `income.exempt.employer_abroad` | Name of employer / payer abroad | text | — | — | — | ● |
| `income.exempt.channel` | Foreign currency declaration / customs vs **banking channel** | enum | — | — | — | ● banking |
| `income.exempt.bank_name` | Bank (if banking channel) | text | — | — | — | ● |
| `income.exempt.account_name` | Account name | text | — | — | — | ● |
| `income.exempt.account_number` | Account number | text | — | — | — | ● |

---

## 7. Rebate tab

| `field_id` | Portal label (EN) | Type | E3 | V1 | V2 | V3 |
|------------|-------------------|------|----|----|----|-----|
| `rebate.cat.life_insurance` | Life Insurance Premium | bool+money | ▸ | — | — | — |
| `rebate.cat.dps` | Deposit Pension Scheme (DPS) | bool+money | ▸ | ● | — | ○ assets only |
| `rebate.cat.sanchaypatra` | Approved Sanchayapatra | bool+money | ▸ | ○ | — | ○ |
| `rebate.cat.unit_mutual_etf` | Unit / mutual fund / ETF / JIS | bool+money | ▸ | — | — | — |
| `rebate.cat.listed_shares` | Listed stocks / shares | bool+money | ▸ | ○ | — | — |
| `rebate.cat.gpf` | General Provident Fund | bool+money | ▸ | — | — | — |
| `rebate.cat.rpf` | Recognized Provident Fund | bool+money | ▸ | ○ | — | ○ |
| `rebate.cat.superannuation` | Approved superannuation | bool+money | ▸ | — | — | — |
| `rebate.cat.benevolent_group` | Benevolent / group insurance | bool+money | ▸ | — | — | — |
| `rebate.cat.zakat` | Zakat fund | bool+money | ▸ | — | — | — |
| `rebate.cat.universal_pension` | Universal pension scheme | bool+money | ▸ | — | — | — |
| `rebate.cat.others` | Others | bool+money | ▸ | — | — | — |
| `rebate.dps.add_bank` | DPS — bank, account, deposits in year | repeater | — | ● City 2,000 | — | — |
| `rebate.total_actual_investment` | Total Actual Investment | computed | ▸ | — | — | — |
| `rebate.total_allowable_rebate` | Total Allowable Investment for Rebate | computed | ▸ | — | ○ caps 120k/500k | — |
| `rebate.computed_amount` | Rebate applied on Tax & Payment | computed | ▸ | ● 3,150 | ○ 10% leg | — |

---

## 8. Expenditure tab

| `field_id` | Portal label (EN) | Type | E3 | V1 | V2 | V3 | E1 |
|------------|-------------------|------|----|----|----|-----|-----|
| `expenditure.mode_detailed` | Itemized lifestyle (Yes) vs simplified (No) | bool | — | ● Yes | — | ● Yes | ▸ |
| `expenditure.food_clothing_essentials` | Food, clothing, other essentials | money | ▸ | ● 340,000 | — | ● | ● 92,000 |
| `expenditure.accommodation` | Accommodation expense | money | ▸ | ● 203,000 | — | ● | ● 80,000 |
| `expenditure.auto_transport` | Auto and transportation | money | ▸ | — | — | — | ● 12,000 |
| `expenditure.household_utility` | Household & utility (elec, gas, water, phone, TV) | money | ▸ | ○ + phone 3k | — | ● (combined ○ 31k) | ● 48,000 |
| `expenditure.education` | Education expenses | money | ▸ | ○ children | — | ● | ● 25,000 |
| `expenditure.festival_special` | Festival / party / special | money | ▸ | ○ | — | ● | ● 72,000 |
| `expenditure.travel_vacation` | Travel / vacation (if separate) | money | — | — | — | — | ● 20,000 |
| `expenditure.medical_other` | Medical / any other (comment) | money | ▸ | ○ | — | — | — |
| `expenditure.any_other` | Any other expenses | money | ▸ | ○ | — | — | — |
| `expenditure.comment_per_row` | Comment (optional per row) | text | ▸ | — | — | — | — |
| `expenditure.total_lifestyle` | Total expense relating to lifestyle | computed | ▸ | — | — | ● 344,000 | ● 349,000 |
| `expenditure.tax_charges_paid` | Tax, charges etc. paid in income year | money | ▸ | ● 5,000 | — | ○ skip (0 tax) | ● 0 |
| `expenditure.personal_loan_interest` | Interest on personal loan | money | ▸ | — | — | — | ● 0 |
| `expenditure.environmental_surcharge` | Environmental surcharge | money | ▸ | — | — | — | ● 0 |
| `expenditure.grand_total` | Total amount of expense and tax | computed | ▸ | — | — | — | — |

**V1 rule of thumb:** expenses plausible vs income — not too high/low.

---

## 9. Assets & liabilities — assets

| `field_id` | Portal label (EN) | Type | E3 | V1 | V2 | V3 |
|------------|-------------------|------|----|----|----|-----|
| `assets.import_autofill_prior` | Import and Autofill (prior online return) | action | ▸ | ● | — | ● |
| `assets.import_from_income` | Import from Income (FDR/DPS/bank) | action | ▸ | — | — | — |
| `assets.business_capital` | Business capital | money | ▸ | — | — | ● No |
| `assets.non_agricultural_property` | Non-agricultural property | repeater | ▸ | — | — | ○ |
| `assets.agricultural_property` | Agricultural property | repeater | ▸ | — | — | ○ |
| `assets.financial.shares_debentures` | Shares / debentures / securities | repeater | ▸ | ○ shares | — | — |
| `assets.financial.sanchaypatra` | Sanchaypatra (closing / holding) | repeater | ▸ | ○ | — | ○ |
| `assets.financial.fdr_term` | Fixed / term deposits | repeater | ▸ | ● closed→cash | — | ○ |
| `assets.financial.dps` | DPS — bank, account, **closing balance** | repeater | ▸ | ● | — | ● |
| `assets.financial.bank_accounts` | Bank accounts — name, number, **30 Jun balance** | repeater | ▸ | ● CD 32,590 | — | ● |
| `assets.financial.loan_given` | Loan / advance given to others | repeater | — | — | — | ○ |
| `assets.financial.pf_balance` | Provident fund balance | money | — | — | — | ○ |
| `assets.financial.other` | Other financial asset | repeater | — | — | — | ○ |
| `assets.motor_car` | Motor car | repeater | ▸ | — | — | ○ |
| `assets.gold.quantity_vori` | Gold — quantity (vori) | number | — | ● 10 vori gift | — | ● gift |
| `assets.gold.value` | Gold — value | money | — | ● 0 gift | — | ● 0 |
| `assets.furniture_equipment` | Furniture / electronics / equipment | money | ▸ | ● must value | — | ● 100,000 |
| `assets.cash_in_hand` | Cash in hand | money | ▸ | ● 615,825 | — | ● 0→adjust |
| `assets.other_tangible` | Other assets (portal list) | repeater | ▸ | — | — | — |

---

## 10. Assets & liabilities — liabilities & reconciliation

| `field_id` | Portal label (EN) | Type | E3 | V1 | V2 | V3 | E1 |
|------------|-------------------|------|----|----|----|-----|-----|
| `liabilities.outside_business` | Liabilities outside business (loans) | repeater | ▸ | ● none | — | ○ | — |
| `liabilities.bank_loan` | Bank loan | repeater | — | — | — | ○ | — |
| `outflow.annual_living` | Annual living expense (from expenditure) | computed | ▸ | ● flows | — | ● auto | ▸ |
| `outflow.other_fund` | Other fund outflow | money | ▸ | — | — | — | — |
| `outflow.total` | Total fund outflow | computed | ▸ | ● 811,202 | — | ● 1,037,718 | — |
| `source.taxable_income` | Source of fund — taxable income | computed | ▸ | ● | — | ● | ▸ |
| `source.tax_exempt` | Source of fund — tax-exempt / remittance | computed | ▸ | ● 259k exempt | — | ● 600k+135k parts | — |
| `source.other_receipts` | Gifts / contributions received | money | ▸ | ● none | — | — | — |
| `source.total` | Total sources of fund | computed | ▸ | — | — | ● must match outflow | ● 550,016 |
| `wealth.prior_net` | Net wealth of previous income year | money | ▸ | ● 1,203,000 | — | ● 0 / autofill | ● 39,999 |
| `wealth.gross` | Gross wealth (current) | computed | ▸ | ● 1,414,202 | — | ● | — |
| `wealth.net` | Net wealth | computed | ▸ | ● 1,414,202 | — | ● | ● 201,016 |
| `wealth.change` | Change in net wealth | computed | ▸ | ● | — | ● | — |
| `wealth.difference` | **Difference (must be 0)** | computed | ▸ | ● 0 | — | ● 0 | ● 0 |
| `wealth.reconcile_via_cash` | Balance via cash in hand / furniture tweak | UX | — | — | — | ● ±300 demo | — |

---

## 11. Tax & payment

| `field_id` | Portal label (EN) | Type | E3 | V1 | V2 | V3 |
|------------|-------------------|------|----|----|----|-----|
| `tax.display.employment_taxable` | Employment taxable | computed | ▸ | ● 518,000 | — | ● 200,000 |
| `tax.display.finasset_taxable` | Financial asset taxable | computed | ▸ | ● 34,202 | — | — |
| `tax.display.other_taxable` | Other sources taxable | computed | ▸ | — | — | ● 100,000 |
| `tax.display.total_taxable` | Total taxable income | computed | ▸ | ● 552,202 | ○ examples | ● &lt;400k |
| `tax.display.exempt_income` | Tax exempt income total | computed | ▸ | ● 259,000 | — | ● remittance |
| `tax.display.gross_tax` | Gross tax before rebate | computed | ▸ | ○ 15,278† | ○ slab math | ● 0 |
| `tax.display.rebate` | Tax rebate | computed | ▸ | ● 3,150 | ○ 10% leg | — |
| `tax.display.net_tax` | Net tax after rebate | computed | ▸ | ● 12,128 | — | ● 0 |
| `tax.display.minimum_tax` | Minimum tax | computed | ▸ | ● 5,000 | ● flat 5k | ○ N/A |
| `tax.display.payable` | Total amount payable | computed | ▸ | ● 12,128 | — | ● 0 |
| `tax.ledger.update_status` | Update Tax Payment Status | action | ▸ | ● | — | — |
| `tax.claim.type_ibas++` | Claim — Salary iBAS++ (govt) | action | ▸ | ○ | — | — |
| `tax.claim.type_salary_others` | Claim — Salary Others (private) | action | ▸ | ● | — | — |
| `tax.claim.type_bank_interest` | Claim — Bank/FI interest | action | ▸ | ○ | — | — |
| `tax.claim.type_sanchaypatra` | Claim — Sanchaypatra | action | ▸ | — | — | — |
| `tax.claim.employer_name` | Employer name (salary others) | text | ▸ | ● | — | — |
| `tax.claim.challan_reference` | Challan reference number | text | ▸ | ● | — | — |
| `tax.claim.challan_date` | Challan date | date | ▸ | ● | — | — |
| `tax.claim.amount` | Claim amount | money | ▸ | ● 12,420 total | — | — |
| `tax.claim.bank` | Bank / branch (through which paid) | text | ▸ | ● | — | — |
| `tax.payment.go_to` | Tax Payment → Go To | action | ▸ | ● | — | — |
| `tax.payment.paid_total` | Total payment recorded | money | ▸ | ● 12,420 | — | — |
| `tax.payment.refundable` | Refundable | computed | ▸ | ● 292 | — | — |
| `tax.pay_now` | Pay Now (if payable &gt; 0) | action | ▸ | ○ | — | — |
| `tax.actions.proceed_online_return` | Proceed / Process to Online Return | action | ▸ | ● | — | ● |

† V1 gross tax **discarded** for calc — see `verification-findings.md` F11.

---

## 12. Return view & post-submit

| `field_id` | Portal label (EN) | E3 | V1 | V2 | V3 |
|------------|-------------------|----|----|----|-----|
| `return.preview.form` | IT-11GA (2023) preview EN/BN | ▸ | ○ | — | ○ |
| `return.preview.header` | Name, NID, TIN, circle, zone, AY, resident | ▸ | — | — | — |
| `return.submit.confirm` | Submit Return → Yes | ▸ | ● | — | ● |
| `return.doc.acknowledgement` | Acknowledgement slip | ▸ | — | — | ● |
| `return.doc.express_certificate` | Express certificate / PSR | ▸ | — | — | ● |
| `return.menu.tax_record` | Tax Record downloads | ▸ | — | — | ● |

---

## 13. V2-only (policy video — computed / rules, not full wizard)

| `field_id` | Topic | V2 |
|------------|-------|-----|
| `policy.slab.exempt_threshold_general` | Tax-free threshold 400,000 | ● |
| `policy.slab.bands` | 300k@10%, 400k@15%, 500k@20%, 2M@25%, rest@30% | ● |
| `policy.rebate.investment_pct` | 15% → 10% | ● |
| `policy.rebate.cap` | 1M → 750k | ● |
| `policy.filing.quarter_rebate` | Jul–Sep rebate; Oct–Dec forfeit | ● |
| `policy.minimum.flat_5000` | Location UI but min 5,000 computed | ● |
| `policy.minimum.first_filer_1000` | First-time min 1,000 when triggered | ● |

---

## 14. Mapping notes for implementers

1. **`field_id`** is stable for JSON schema / OpenAPI — align with future `TaxInputs` extensions.  
2. **E3** is superset; videos are **persona subsets** — empty cells mean “not shown,” not “does not exist.”  
3. **Expenditure + wealth** must stay internally consistent (`wealth.difference = 0`).  
4. **E1** proves expenditure row set for one real filer; use alongside V1 for regression, not as portal exhaustive list.  
5. Extend this file when adding **E5/E6** (Act, filed 26-27) — add column `E6` rather than editing video prose.

**Index:** [`video-guide.md`](video-guide.md)
