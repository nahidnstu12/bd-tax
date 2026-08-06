---
topic: out-of-scope
source: "BD Tax Assistant scope v1"
---

<!--
  One exclusion per ## heading, on purpose.

  The original version listed all eight excluded heads in a single prose
  paragraph. That became ONE embedding vector averaged across eight unrelated
  topics, so "what is the corporate tax rate?" could not retrieve it — the
  ablation confirmed this under all five chunking strategies. A refusal you
  cannot retrieve is the same as no refusal at all.

  Each heading below is phrased as the question a user would actually type,
  because the heading is embedded along with the body.
-->

## What does this assistant cover?

This assistant is built for **resident individual** taxpayers with **salary**
income, **house property** income (the net rental figure you supply), and
**bank or financial-asset interest** entered as a single amount. Anything
outside those three heads is not modelled, and the sections below name each
exclusion explicitly.

## Does this assistant handle company or corporate tax?

No. **Company, corporate and firm taxation are out of scope.** This tool models
personal income tax for individuals only. Corporate rates, minimum tax on
turnover, and firm or Association of Persons assessments are not covered and
no figure here should be applied to a company return.

## Can it calculate capital gains?

No. **Capital gains are out of scope** — gains on shares, land, flats, or any
other asset disposal are not computed and not included in total income here.
If you sold property or securities during the income year, that portion of your
return needs a qualified practitioner.

## What about business or professional income?

No. **Business and professional income are out of scope.** Trading profits,
consultancy fees, freelance earnings, and partnership shares are not modelled.
If you file with a business head, the totals this calculator produces will not
match your return.

## Does it cover foreign or overseas income?

No. **Foreign income is out of scope**, including offshore salary, remittance
treated as income, foreign property, and foreign bank interest. Double-taxation
relief and treaty positions are not modelled at all.

## Is agricultural income supported?

No. **Agricultural income is out of scope.** The exemption thresholds and
special treatment that apply to farm income are not implemented, so a return
that includes an agricultural head cannot be reproduced by this calculator.

## What about non-resident taxpayers?

No. **Non-resident rules are out of scope.** Everything here assumes resident
individual status for the full income year. Residency tests, non-resident rates,
and the surcharge treatment that differs for non-residents are not modelled.

## Does it compute the net-wealth surcharge?

No. **Net-wealth surcharge amounts are out of scope.** The calculator does not
compute surcharge from your asset statement. It may describe how the surcharge
works, but it will not produce a taka figure you can file.

## Can this assistant file my return for me?

No. **It does not submit anything to NBR on your behalf.** It explains published
rules and runs arithmetic on the figures you type in. Every value still has to be
entered into the official e-Return portal by you, and the portal's own totals are
what get assessed.

## When should I use a tax professional?

If your return needs firm or Association of Persons income, offshore property,
voluntary disclosure under the 7th Schedule, or asset schedules more complex than
simple inputs, use a qualified practitioner. The Ask tab may still describe
**portal process** — how to register, how to pay — but it will never invent
figures for heads we do not model.
