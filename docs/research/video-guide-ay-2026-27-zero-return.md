# NBR e-Return — Video notes: “zero tax” return (AY 2026-27)

**Source:** RM Konsa — student / homemaker / low-income employee filing  
**Assessment year:** **2026-27** (income year **2025-07-01 → 2026-06-30**)  
**Audience:** Taxable income **below BDT 400,000** (general slab-free threshold for 2026-27) — **zero tax payable**, not “all fields zero”  
**Portal:** https://etaxnbr.gov.bd (search “e return” → official site)  
**Calculator config:** `rules/ay-2026-27/config.json` (`exempt_threshold.general`: 400000)  
**Index / drift:** [`video-guide.md`](video-guide.md) · **All fields:** [`video-guide-portal-field-map.md`](video-guide-portal-field-map.md) (column **V3**)

> Rank-3 evidence. Demo mixes **remittance (exempt) + tuition + salary**; pick only the heads that match the filer. Reconciliation (**Difference = 0**) is mandatory even when tax is zero.

---

## 1. Who this applies to

| Profile | Typical pattern in video |
|---------|---------------------------|
| **Homemaker** | Foreign remittance (husband abroad) + optional low salary |
| **Student** | Tuition income; father abroad → remittance |
| **Private employee** | Salary only; **employment taxable slice &lt; 400,000** → zero slab tax |

**“Zero return”** = **net tax 0** because total **taxable income** stays under the **400,000** general threshold (2026-27). You still declare income, expenditure, and assets where required.

---

## 2. Access & registration (reminders)

- Prefer **desktop browser** (mobile = more entry errors).
- **Not registered:** complete registration first (separate video — wrong attempts can **block** online filing).
- **Requirements:** TIN + mobile number **biometric-verified** against NID (current SIM used at sign-up must match NID/fingerprint registration).

**Sign in:** TIN, password → portal home shows **Assessment Year 2026** / **2026-27** flow.

**Path:** **Submission → Regular e-Return**

---

## 3. Assessment tab

| Field | Demo / guidance |
|--------|-----------------|
| Return scheme | **Self** (fixed) |
| Assessment year | **2026-27** (auto) |
| Income year | **01-Jul-2025 → 30-Jun-2026** (auto) |
| Residential status | **Resident** (filing from Bangladesh) |
| **Tax exempted income** | **Yes** if filer has **fully exempt** income (e.g. **foreign remittance**). **No** if none — then head-of-income checkboxes behave differently (video: without exempt income you must still declare support/income) |

### Heads of income (enable what applies)

Video **composite demo** (homemaker + student + job):

| Head | Use when |
|------|----------|
| **Income from Employment** | Private job (annual salary certificate totals) |
| **Income from Other Source** → **Any other income** | **Tuition** (particulars, payer, dates, gross/fees) |
| **Tax exempted income** → **Foreign remittance** | Remittance received in income year (fully exempt) |

Skip heads you do not have (rent, business, financial asset unless sanchaypatra **profit** — see §7).

**Save & Continue**

---

## 4. Additional information

### Location of main source of income

Select zone matching employer / main income (Dhaka North/South, Chattogram, other CC, outside CC).

> Video: for returns with **no tax**, minimum tax does not bite; when min tax applies, **5,000** flat (see [`video-guide-ay-2026-27-policy-updates.md`](video-guide-ay-2026-27-policy-updates.md)).

### Special threshold categories (tick if applicable)

- Gazetted freedom fighter  
- Person with disability / third gender  
- Parent/legal guardian of disabled person (benefit claim)

### Tax rebate for investment

**No** in demo — no tax due, so rebate not needed (even if DPS/sanchaypatra exist elsewhere on assets).

### ITNBB-style declarations

Answer motor car, foreign property, shares, house property honestly.

**ITNBB may not be mandatory — still want to submit? → Yes**  
Required to unlock full **Assets & Liabilities** schedule (income, expense, **and** wealth).

**Continue**

---

## 5. Income — employment (demo)

- Type: **Private employee** (or government / IBS++ path if applicable)
- Employer name, designation (demo placeholders)
- Enter **full income-year totals** (Jul 2025 – Jun 2026): basic, house rent, medical, conveyance, festival bonus; **Add** / **Other if any give detail** for lines not in dropdown

**Employment summary (demo):**

| Line | BDT |
|------|-----|
| Total salary / regular income | 406,000 |
| Tax-free portion (portal schedule) | 135,000 |
| **Taxable from employment** | **200,000** |

If **only** employment and taxable slice **&lt; 400,000**, slab tax = **0** (video stress case for employees).

---

## 6. Income — other source (tuition)

- **Income from Other Source** → **Any other income**
- Particular: e.g. **Tuition**
- Payment authority: e.g. **Students’ parents**
- Payment date(s); gross **120,000** / year (video uses lump sum, not monthly)
- Expenses **20,000** → **net 100,000**

---

## 7. Income — tax exempt (foreign remittance)

- **Foreign remittance**
- Amount (income year): **600,000**
- Country: e.g. Italy (use filer’s actual)
- Source of income abroad: salary / business / employer name as applicable
- Channel: usually **Banking channel** → bank name, account name, account number

**Save & Continue** (Income complete)

> **Sanchaypatra:** if certificates earn **profit**, video points to a **separate** head — **Income from Financial Asset** on Assessment (not covered step-by-step in this clip; see salary video / prior year tutorials).

---

## 8. Expenditure

**Yes** → itemized living expenses (recommended in video):

- Food, clothing, essentials  
- Accommodation  
- Household utilities (electricity, gas, water, phone, etc.) — portal may show a **combined** utility subtotal (demo **31,000** on one line)  
- Education  
- Festival / party/diet  

**Demo total expenditure:** **344,000** (scaled to combined income: remittance 600k + tuition net 100k + salary flow; keep **consistent with declared income** — expense must not exceed plausible share of funds).

**Tax payment expense:** skip when **no tax paid** (zero tax case).

---

## 9. Assets & liabilities

Fill even for “zero tax” filers if ITNBB/assets path enabled.

| Asset (demo) | Notes |
|--------------|--------|
| DPS | Bank, account, **closing balance** |
| Sanchaypatra / FDR | If held; profit → financial asset income head |
| Gold (gift) | **Vori** count; video uses **value 0** for gift |
| Furniture / electronics | Purchase value e.g. **100,000** |
| Bank accounts | Balance on **30-Jun-2026** (year-end) |
| **Cash in hand** | Start **0** while drafting; use to **balance** reconciliation |
| Liabilities | Loans from bank/others if any |

**Import and Auto Fill:** if **not** first return, pull prior-year assets then adjust (e.g. DPS +12 months installments, remove sold furniture).

### Wealth reconciliation (must read)

- **Gross wealth** = sum of assets  
- **Prior net wealth** (0 if first return; else last year)  
- **Change in net wealth**, **annual living expense** (from expenditure), **other fund outflow**  
- **Source of fund** = taxable + **tax-free** (remittance 600k + employment exempt portion + tuition taxable, etc.)  
- **Difference** must be **0** before continue  

**Fix Difference:** adjust **cash in hand** (preferred) or asset values (e.g. furniture ± small amount) — video shows ±300 BDT tweak example.

**Demo reconciliation snapshot:**

- Taxable income components still **&lt; 400,000** → zero tax  
- Total fund outflow example: **1,037,718** (video figure; treat as illustrative)  
- After cash adjustment → **Difference 0**

---

## 10. Tax & payment

**Total tax payable: 0** — no payment, no TDS claim required for this demo.

**Save & Continue** → **Process to Online Return**

---

## 11. Submit & certificates

- Review return view  
- **Submit Return** → confirm **Yes**  
- Download **acknowledgement slip** (tax record)  
- **Express certificate** available after submission  

---

## 12. Profile matrix — what to omit

| Filer | Typical heads | Rebate | Tax |
|-------|---------------|--------|-----|
| Homemaker, remittance only | Tax exempt remittance; maybe Other none | No | 0 if no taxable slice |
| Student, tuition only | Other source tuition | No | 0 if net + other taxable &lt; 400k |
| Employee, salary only | Employment | No | 0 if employment taxable &lt; 400k |
| Mixed (video) | Employment + Other + Exempt remittance | No | 0 if **aggregate taxable** &lt; 400k |

---

## Calculator / eval hook (sanity)

For **AY 2026-27** with `exempt_threshold.general = 400000`:

```
taxable_salary_slice = 200000   // demo employment summary
taxable_tuition_net  = 100000
remittance           = 600000   // exempt — not in slab base
total_taxable        = 300000   // 200k + 100k → expect gross slab tax 0
minimum_tax          = 0        // if applies_when is above threshold only — confirm V2
```

Add a replay fixture when a filed zero-tax 26-27 return exists (`E6` in index).

---

## AI prompt snippet

```
Bangladesh AY 2026-27 zero-tax e-Return: taxable income under 400000 general threshold → 0 slab tax; still file income, expenditure, assets. Heads: Employment (annual salary cert totals), Other Source for tuition, Tax Exempt Foreign Remittance (banking channel details). Tax exempted income Yes on assessment if remittance. ITNBB optional submit Yes to enable assets. Reconciliation Difference must be 0 (cash in hand balancing). No rebate Yes if no tax. Min tax 5000 irrelevant when no tax due. AY 2026-27 income year 2025-07-01 to 2026-06-30.
```

---

*Timestamps and subscribe filler removed. Transcript numbers are demo-only; verify against portal for your TIN.*
