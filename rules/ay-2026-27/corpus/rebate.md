---
assessment_year: "2026-27"
topic: rebate
source: "config rules/ay-2026-27/config.json; policy video E2b"
---

## How did the investment rebate change for 2026-27?

Versus 2025-26, the **investment leg** dropped from **15% to 10%** of eligible investment,
and the **absolute cap** dropped from **10,00,000 to 7,50,000 taka**. The **3% income
leg** is unchanged in config (base still open as V1). Rebate remains the **lowest of the
three** legs.

## Can I lose rebate by filing late?

An NBR policy video claims **investment rebate is only if you file in the first quarter
(Jul–Sep)** of the filing season; Oct–Dec filing may forfeit rebate. This is stored as
`_filing_rebate_quarters` in config as **unverified** — the calculator does **not** apply
quarter rules yet.

## Which investments count toward rebate?

Same twelve categories as the NBR Rebate tab (see 2025-26 rebate corpus). Video examples
mention counting up to **1,20,000** DPS and **5,00,000** Sanchayapatra toward eligible
totals on the portal; the calculator takes **eligible investment** as a single input you
supply.
