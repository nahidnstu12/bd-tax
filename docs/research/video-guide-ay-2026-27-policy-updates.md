# NBR e-Return — Video notes: policy & portal updates (AY 2026-27)

**Source:** RM Konsa — “what changed” / online submission open  
**Assessment year:** **2026-27** (income year **2025-07-01 → 2026-06-30**)  
**Language:** Bengali transcript → English, AI/RAG friendly  
**Portal:** https://etaxnbr.gov.bd — **2026-27** selectable when video was recorded  
**Calculator config:** `rules/ay-2026-27/config.json`  
**Pair with:** [`sources-2026-07-29.md`](sources-2026-07-29.md), [`video-guide.md`](video-guide.md) (index + drift), **[`video-guide-portal-field-map.md`](video-guide-portal-field-map.md)** (column **V2** + §13)

> Rank-3 evidence. Slab/rebate figures **align with blog sources** in repo; quarter penalties and flat minimum tax need **Act/circular or filed return** confirmation.

---

## 1. Portal status

- Online **Regular e-Return submission** live (video: shortly after announcement).
- **Assessment Year 2026-27** added; older years still submittable.
- Slab tax, rebate, minimum tax computed in portal — **inputs** must be correct.

---

## 2. Slab structure (individual)

Presenter contrasts “old” vs “new”. **Implement from `rules/ay-2026-27`**, not the video’s simplified “old” column (blogs already had 375k + 300k@10% for 2025-26, no 5% band).

### New (AY 2026-27 — matches config)

| Step | Band |
|------|------|
| Tax-free (general) | First **400,000** @ 0% |
| Then | **300,000** @ 10% |
| Then | **400,000** @ 15% |
| Then | **500,000** @ 20% |
| Then | **2,000,000** @ 25% |
| Remainder | **30%** |

**Changes vs prior filing cycle (narrative):** threshold **375k → 400k**; **5% band removed**; remainder rate **25% → 30%** on top slice (config already had 30% on remainder).

### Calculation examples (video)

**Taxable 500,000:** minus 400,000 → 100,000 @ 10% = **10,000**.

**Taxable 800,000:** remainder 400,000 → 300,000 @ 10% = 30,000 + 100,000 @ 15% = 15,000 → **45,000** total.

---

## 3. Investment rebate

**Rule:** rebate = **minimum of three**:

| Leg | AY 2025-26 (prior) | AY 2026-27 (current) |
|-----|-------------------|----------------------|
| Income | 3% (base: see V1 in config) | 3% |
| Eligible investment | **15%** | **10%** |
| Absolute cap | **1,000,000** | **750,000** |

**Investment amounts counted (video caps for rebate base):**

- DPS: max **120,000** / year toward eligible total  
- Sanchaypatra: max **500,000**

**Worked example:** taxable **900,000**, DPS **120,000** only  

- 3% leg = **27,000**  
- Prior year: 15% × 120k = **18,000** → rebate **18,000**  
- Current: 10% × 120k = **12,000** → rebate **12,000**

Higher free threshold does **not** always mean lower tax if rebate was investment-bound.

---

## 4. Filing quarters vs investment rebate

**UNVERIFIED** — reconcile with NBR circular and `filing_deadline` (2026-11-30 in config).

| Window (quarters from **July**) | Rebate | Penalty |
|--------------------------------|--------|---------|
| **Jul – Sep** | **Yes** | — |
| **Oct – Dec** | **No** (even with investments) | None (video) |
| **Jan – Mar+** | No | Yes (amounts in other video) |

Filers needing investment rebate should file in **first quarter**, not wait for November rush if that falls in Oct–Dec.

Stored in config as `_filing_rebate_quarters` (unverified).

---

## 5. Minimum tax

### Flat 5,000 (video claim for current portal)

- UI may still ask **location** (Additional Information).
- After completion, video author saw **5,000** minimum everywhere, including “other city corporation”.
- Any positive slab tax below 5,000 → still pay **5,000** (e.g. taxable **420,000** → 2,000 computed → **5,000** minimum).

**Conflicts with** [`video-guide-ay-2025-26-salary.md`](video-guide-ay-2025-26-salary.md) (3k/4k/5k by zone). See drift in [`video-guide.md`](video-guide.md).

### First-time filer

- **1,000** minimum when minimum tax **applies** (new filer / new TIN path — video wording).
- **Not** if income stays below tax-free threshold (no minimum triggered).
- **Repeat filers:** **5,000** when minimum applies — no 1,000 concession.

---

## AI prompt snippet (2026-27 policy)

```
Bangladesh AY 2026-27: exempt threshold 400000; bands 300k@10%, 400k@15%, 500k@20%, 2M@25%, rest@30%. Rebate=min(3% income leg, 10%×eligible investment, cap 750000); DPS count max 120000, sanchaypatra max 500000. File Jul-Sep to keep investment rebate; Oct-Dec loses rebate; later quarters penalties (unverified). Minimum tax 5000 when triggered; first-time filers 1000 when min applies; repeat 5000. Portal location field may not change 5000 floor per policy video.
```

---

*Timestamps and subscribe filler removed.*
