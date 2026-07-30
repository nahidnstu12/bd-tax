# NBR e-Return — Video notes: salaried filing (AY 2025-26)

**Source:** RM Konsa — return submission tutorial (salary + tax payment)  
**Assessment year:** **2025-26** (income year **2024-07-01 → 2025-06-30**)  
**Language:** Bengali transcript → English, AI/RAG friendly  
**Portal:** https://etaxnbr.gov.bd  
**Calculator config:** `rules/ay-2025-26/config.json`  
**Pair with:** [`etax-filing-guide.md`](etax-filing-guide.md), [`video-guide.md`](video-guide.md) (index + drift)

> Rank-3 evidence (video). UX and field semantics are useful; **digits may be wrong** (see `verification-findings.md` F11). Cross-check arithmetic against `private/returns/sample-real-2025-26.json` where available.

---

## Workflow

1. Log in → **Home → Submission → Regular e-Return**
2. Complete tabs with **Save & Continue**; **Save Draft** anytime
3. **Tax & Payment** → claim TDS → pay if due → **Return View** → **Submit Return**

```
Assessment → Income → Rebate → Expenditure → Assets & Liabilities → Tax & Payment → Return View
```

---

## 1. Assessment

| Field | Guidance |
|--------|----------|
| Return Scheme | **Self** |
| Assessment Year | **2025-26** |
| Income Year | **01-Jul-2024 → 30-Jun-2025** (12 months) |
| Partial employment | If job starts mid-year (e.g. October), set period from **start month** |
| Residential status | **Resident** (BD citizen); **Non Resident** otherwise |
| Tax exempted income | **Yes** only if **all** income fully exempt; salary demo uses **Income from Employment** |

**Heads of income:** enable only what applies — Employment (this video), Rent, Agriculture, Business, Capital Gain, Financial Asset, Other Source, Voluntary Disclosure (skip if none).

**Save & Continue** → **Additional Information**

---

## 2. Additional information

### Minimum tax by filing zone (this video)

| Area | Minimum tax (BDT) |
|------|-------------------|
| Dhaka South / North City Corporation | 5,000 |
| Chattogram City Corporation | 5,000 |
| Other city corporations | 4,000 |
| All other areas / tax zones | 3,000 |

Example filer: **Dhaka South City Corporation**.

> **Drift:** AY 2026-27 policy video claims **flat 5,000** nationwide. The **calculator** uses flat 5,000 for both years and does **not** model 3k/4k/5k zones. See [`verification-findings.md`](../verification-findings.md) F2 and drift table in [`video-guide.md`](video-guide.md).

### Tax rebate

**Yes** if qualifying investments (DPS up to 120k counted, sanchaypatra up to 500k — per video). For **2025-26 rates** use **15%** investment leg and **1M** cap in `rules/ay-2025-26/config.json`.

### ITNBB

| Declaration | When **Yes** |
|-------------|----------------|
| Gross wealth > BDT 50 lakh | Over threshold |
| Motor car / office property / house | If owned |
| Share / director | If applicable |
| Submit ITNBB when optional | **Yes** if you want it on record |

---

## 3. Income — employment

**Profile:** Private sector (ABC Company, manager). Government: IBS++ path if salary qualifies, else government employment type.

Enter **annual totals** from employer **salary certificate**:

- Basic, house rent, medical, conveyance, festival bonus (sum both bonuses)
- Provident fund if any (demo: none)

**Save Draft** → **Employment Summary** → total regular income must match certificate.

| Metric | BDT (demo) |
|--------|------------|
| Total regular income | 777,000 |
| Exempt (1/3 of salary) | 259,000 |
| Taxable employment (2/3) | 518,000 |

**Add Employment** for multiple employers in one year.

---

## 4. Income — financial asset

Example: City Bank, Gulshan — term deposit / interest account.

| Item | BDT |
|------|-----|
| Gross interest | 3,477 |
| Bank fees | 575 |
| TDS | 347 |
| Balance 30-Jun-2025 | 346,000 |
| Net income (after fees) | 34,202 |

---

## 5. Rebate tab

DPS, sanchaypatra, recognized PF, shares — align with **Assets & Liabilities** and rebate calculation (**15%** on eligible amount for this AY in demo: **3,150** on DPS investment).

---

## 6. Expenditure

Reasonable vs income — not too high or low.

| Category | BDT (demo) |
|----------|------------|
| Food, clothing, essentials | 340,000 |
| Accommodation | 203,000 |
| Utilities | as filed |
| Phone, internet, TV | 3,000 |
| Education / medical / festival | as applicable |
| Tax at source (expense line) | e.g. 5,000 |

---

## 7. Assets & liabilities

- **Import and Auto Fill** from prior year if not first filing
- FDR withdrawn → may show as **cash in hand**, not FDR
- DPS closing balance ↔ rebate tab investments
- Gold, furniture/electronics: show values when owned
- **Difference = 0** required before submit

Demo: gross/net wealth **1,414,202**; prior net wealth **1,203,000**; total outflow **811,202** reconciled to sources.

---

## 8. Tax & payment (demo)

| Line | BDT |
|------|-----|
| Taxable employment | 518,000 |
| Financial asset net | 34,202 |
| **Total taxable** | **552,202** |
| Rebate (15% investment leg in demo) | 3,150 |
| Net tax | 12,128 |
| Minimum tax (Dhaka South) | 5,000 |
| **Payable** | **12,128** |
| TDS claimed | 12,420 |
| **Refund** | **292** |

**Claim TDS:** Update Tax Payment Status → Claim Tax Source → **Salary Others** (private) — employer, challan ref, date, amount, bank/branch per salary certificate (~10–13 challans possible).

---

## 9. Submit

Process to Online Return → **Submit Return** → **Yes**.

---

## AI prompt snippet (2025-26 salary UX)

```
AY 2025-26 Bangladesh e-Return salaried filer: wizard Assessment→Income→Rebate→Expenditure→Assets→Tax&Payment→Return View. Employment 1/3 exempt 2/3 taxable (video demo). Minimum tax by zone: 5000 Dhaka N/S and Chattogram CC, 4000 other CC, 3000 elsewhere (UNVERIFIED vs later policy video). Rebate investment rate 15% cap 1M per ay-2025-26 config. Claim private salary TDS via Salary Others. Difference on wealth reconciliation must be 0.
```

---

*Timestamps removed. Not a substitute for Finance Act or filed returns.*
