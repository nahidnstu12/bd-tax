# NBR e-Return — Filing Guide

**Source:** *e-Return User Manual, Version 1.1_25* — National Board of Revenue, August 2025, Dhaka
**Local copy:** `etax-guideline-v1.1.pdf` (19 pages)
**Portal:** https://etaxnbr.gov.bd/#/landing-page
**Captured:** 2026-07-29
**Screenshots throughout the manual show Assessment Year 2025-2026.**

> This is a **process** document — how the official portal works. It contains no tax rates.
> Rate figures live in `sources-2026-07-29.md` and, once verified, in `rules/*/config.json`.

---

## 1. Landing page — six tiles

| Tile | Purpose |
|---|---|
| **eTIN** | Register as a taxpayer (redirects to the eTIN system) |
| **eReturn** | File your return · download Express Certificate — **the main one** |
| **ReturnVerify/PSR** | Verify return submission status |
| **eReturnLedger** | Update tax payment *(manual notes this was not available at time of writing)* |
| **eTaxPayment (eTDS)** | Manage source tax — redirects to the eTDS system |
| **eTaxService** | Support ticketing |

Before the login screen there are **FAQ**, **User Manual**, **Tax Certificate Manual**, and **Contact Us** buttons. The manual recommends reading these first.

**Support:** hotline **09643 71 71 71** · ticketing at **ticket.etaxnbr.gov.bd**

---

## 2. Account setup

### Registration

**Prerequisites — both mandatory:**
- A **TIN**
- A **biometric-verified SIM** registered against your NID

**Steps:**
1. Sign-in page → **Register**
2. Enter TIN, biometric-verified mobile number, captcha → **Verify**
3. If the mobile number matches NID records, a 6-digit **OTP** is sent
4. Enter OTP, set and confirm a password → **Submit**
5. Redirected to Sign In

Step-by-step video guides are linked on the Sign Up page (*How to Register*, *How to File Tax Return*, *How to Get Tax Certificate Online*).

### Sign in
TIN + password + captcha.

### Forgot password
Sign-in page → **Forgot Password** → TIN + registered mobile → **Send OTP** → enter OTP → set new password.

### Change mobile number
Sign-in page → **Change mobile number** → TIN + new mobile → **Verify** → OTP + password.
**The new number must also be biometric-verified.**

---

## 3. The return wizard

`Submission → Regular e-Return`. (A **Revised Return U/S-180(2)** option also exists.)

Seven tabs, navigated with **Save & Continue**; **Save Draft** preserves progress at any point:

```
Assessment → Income → Rebate → Expenditure → Assets & Liabilities → Tax & Payment → Return View
```

### 3.1 Assessment

**Assessment Information**
- Return Scheme (e.g. *Self*)
- Assessment Year — screenshots show `2025-2026`
- Income Year — **`01-07-2024` to `30-06-2025`** for AY 2025-2026
- Residential status: Resident / Non Resident
- Tax Exempted Income: yes / no

**Heads of Income** — checkboxes:
- Income from Employment
- Income from Rent
- Income from Agriculture
- Income from Business
- Capital Gains
- Income from Financial Assets
- Income from Other Sources

**Other sources** — separate checkboxes:
- As a Partner of a Firm
- As a Member of an AoP
- Income Earned outside Bangladesh
- Income Earned by the Spouse or Minor Children (Not Assessed Separately)

**Additional Information** *(second Assessment page)*
- Location of Main Source of Income (e.g. *Dhaka South City Corporation*)
- War-wounded Gazetted Freedom Fighter ☐
- Person with Disability ☐
- Claim Benefit as a Parent/Legal Guardian of a Person with Disability ☐
- Tax Rebate: claim rebate for investment? yes / no
- Voluntary Disclosure of Income (under 7th schedule): yes / no

**IT10B Requirements** — triggers the assets statement:
- Gross Wealth over **50,00,000**?
- Own Motor Car?
- Own Offshore Property?
- Shareholder director of a company?
- Have House Property in any City Corporation?

### 3.2 Income

Sub-tabs: **Income from Employment · Income From Rent · Capital Gain · Income from Other Sources**

*Employment* captures: Employment Type (e.g. Private/Other than Government Pay Scale), Employer Name, Designation, Shareholder Director ☐, and **Particulars** (Basic Salary, House Rent Allowance, …). Multiple employers supported via **Add Employment**; an **Employment Summary** view is available.

**Non-Cash Benefits** checkboxes: Rent Free Accommodation · Accommodation at Concessional Rate · Vehicle Facility Provided · Other Non-Cash Benefit.

*Income From Rent* supports multiple properties (**Add Another Property**) with a Property Type selector and a **Rent Summary**.

### 3.3 Rebate

Declare eligible investment made during the year. **Investment Category** checkboxes:

- Life Insurance Premium
- Deposit Pension Scheme (DPS)
- Approved Sanchayapatra
- Unit Certificate / Mutual Fund / ETF / Joint Investment Scheme
- Listed Stocks or Shares
- General Provident Fund (GPF)
- Recognized Provident Fund (RPF)
- Approved Superannuation Fund
- Approved Benevolent Fund & Group Insurance Premium
- Zakat Fund (under Zakat Fund Management ACT 2023)
- Universal Pension Scheme
- Others

Two computed fields: **Total Actual Investment** and **Total Allowable Investment for Rebate**.

### 3.4 Expenditure

Lifestyle expense statement:

Expenses for Food, Clothing and Other Essentials · Accommodation Expense · Auto and Transportation Expenses · Household and Utility Expenses · Education Expenses · Festival and Other Special Expenses · Any Other Expenses · **Total Expense Relating to Lifestyle** · Tax, Charges Etc. Paid During the income year · Interest Payment of Personal Loan · Environmental Surcharge · **Total Amount of Expense and Tax**

Each row has an optional **Comment** field.

### 3.5 Assets & Liabilities

Sections: **Assets · Liabilities (Outside Business) · Other Outflow · Sources of Fund · Net Wealth of Previous Income Year · Summary**

Assets sub-categories: Business Capital · Non Agricultural Property · Agricultural Property · **Financial Assets** (Shares/Debentures/Bond/Securities/Unit Certificate · Sanchayapatra · Fixed Deposits & Term Deposits · …)

**Two autofill helpers:**
- **Import and Autofill** — pulls the previous year's Assets & Liabilities if a return was filed online for that year
- **Import from Income** — pulls Sanchayapatra / FDR / DPS / bank account data already entered on the Income pages

Both require review — the manual says update fields "carefully where needed."

### 3.6 Tax & Payment

Displays all heads of income (Employment, Financial Assets, Rent, Agriculture, Business, Capital Gains, Other Sources, Share of Income from Firm or AoP, Income of Minor or Spouse), then computes **Total Amount Payable**.

Payment rows: **Source Tax · Advance Income Tax (AIT) · Regular Tax before Filing · Adjustment of Tax Refund · Payment with Return**

**Update Tax Payment Status** redirects to the **e-Return Ledger** (separate system).

### 3.7 e-Return Ledger

Where source tax and AIT claims are recorded.

**Only three claim types are auto-verified by the system:**
1. Car AIT
2. iBAS++ source tax from salary
3. Sanchayapatra

Everything else is verified manually by a tax official later.

Menus: Claim Source Tax (Salary iBAS++ · Salary Others · Bank/FI Interest/Profit · Sanchayapatra · Others) · Claim AIT · Tax Paid with Return (173) · Adjustment of Tax Refund · Tax Payment Status · Go to eReturn.

**Sync From Income** auto-pulls figures where available. Online verification depends on the withholding agent's system being connected — it can take from seconds to minutes, and unconnected agents mean the claim shows as unverified. In that case the manual suggests an offline (paper) return prepared by the eReturn system.

Return with **Tax Payment Status → Go to eReturn**.

### 3.8 Tax Payment

If an amount is payable, **Pay Now**.

Final Payable block: Total Amount Payable · Total Payment · Refundable · Payable.

**Payment methods:** Internet Banking · Card · Mobile Banking (Rocket, bKash, Nagad, Upay, tap, CellFin)
**Gateways:** e-Chalan · Sonali Bank Payment

After payment you are redirected back to e-Return automatically.

### 3.9 Return submission

1. Tax & Payment page → scroll down → **Proceed to Online Return**
2. Final preview renders the official form — **IT-11GA (2023), "Form of Return of Income for Individual Person"** — viewable in **English or Bangla**
3. Preview header shows: Name, NID/Passport, TIN, Circle (e.g. *Circle-013 (Salary)*), Taxes Zone, Assessment Year, Residential Status
4. **Back** to correct anything, or scroll down → **Submit Return**
5. Confirmation message appears

### 3.10 Tax Record and documents

The return certificate displays instantly on submission. Downloadable from the **Tax Record** menu:

- TIN Certificate
- Express Certificate / PSR Verification Request
- Certificate Status
- Acknowledgement
- Return
- Challan
- History

---

## 4. What this confirms for our project

| Finding | Impact |
|---|---|
| **AY 2025-2026 income year = 01-07-2024 → 30-06-2025** | Confirms the inference in `sources-2026-07-29.md` §2 |
| Taxpayer category checkboxes: freedom fighter, person with disability, parent/guardian of disabled | Confirms the threshold categories our config must model — including the parent/guardian benefit |
| "Location of Main Source of Income" is still collected | May affect portal minimum tax in some cycles; **calculator uses flat 5,000** — see [`verification-findings.md`](../verification-findings.md) F2 |
| Rebate = "Total Actual Investment" → "Total Allowable Investment for Rebate" | The portal computes an allowable cap before applying the rebate rate — matches the lowest-of-three rule |
| Full eligible-investment category list (§3.3) | Directly seeds `config.json` eligible investments — **12 categories, more than any blog listed** |
| Official form is **IT-11GA (2023)** | The form our output should map to |
| Heads of income list (§3.1) | Defines the scope boundary precisely; our v1 covers Employment, Rent, and Other Sources / Financial Assets only |
| IT10B triggers (wealth > 50,00,000, motor car, offshore property, shareholder director, city-corporation house property) | Out of v1 scope, but worth detecting and warning about |
| Portal has "Import & Autofill" from the prior year | Good UX precedent for our own year-over-year carry-forward |

## 5. Useful for the corpus

These are **process** answers the Ask tab should handle, and none require tax rates:

- What do I need to register? *(TIN + biometric-verified SIM)*
- I changed my phone number — what now?
- Which investments qualify for the rebate? *(the 12 categories)*
- Why is my source tax showing as unverified? *(only 3 claim types auto-verify)*
- What documents can I download after filing?
- How do I pay — what methods are accepted?
- When is IT10B (assets statement) required?

Each can cite this file. **Process content is low-risk** — unlike rates, it doesn't change annually and doesn't produce a wrong number.

## 6. Caveats

- Manual is **v1.1, August 2025**, documenting the AY 2025-2026 cycle. The portal may have changed for AY 2026-2027 — re-check before relying on screenshots.
- The manual notes **eReturnLedger "is not available now"** on the landing page while documenting the Ledger in detail — status unclear.
- "Guidelines for AIT verification will be added gradually" — feature was incomplete at publication.
- No tax rates, slabs, or thresholds appear anywhere in this manual.
