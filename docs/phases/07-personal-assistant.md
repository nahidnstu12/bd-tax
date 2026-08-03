# Phase 7 — Personal tax assistant & finance record

**Goal:** turn the calculator, rules corpus, and e-Return field map into a local personal
filing workspace: collect evidence, prepare a return draft, run rule-backed planning
scenarios, and guide manual submission.

**It does not submit a return.** NBR remains the filing system and its completed return
remains the oracle used by `npm run eval`.

---

## 1. The boundary

The assistant may:

- create and update a private return **draft**
- compute tax and compare planning scenarios deterministically
- explain a result using retrieved, cited rules
- produce a checklist of missing documents and e-Return fields to review
- reconcile income, spending, and wealth using the existing wealth calculation

The assistant must not:

- invent income, expense, investment, source-tax, or tax-payment values
- write a `filed_result` from its own calculation
- claim a tax benefit without a cited rule and a user-provided supporting value
- submit, log in to, or automate the NBR portal
- silently treat lifestyle expenditure as a tax deduction

`filed_result` is filled only after filing, by transcribing NBR's result. It is evidence
for replay evaluation, never a prediction to make the test pass.

---

## 2. Local personal data layout

Keep all personal records under the existing gitignored `private/` directory:

```text
private/
  profile.json                         # stable non-secret preferences; no NID/TIN
  ay-2026-27/
    intake.json                        # user-confirmed facts and evidence references
    return-draft.json                  # current TaxInputs draft
    scenarios/
      current.json
      more-dps.json
    documents.md                       # checklist and local file references
  returns/
    2026-27.json                       # after filing: inputs + NBR filed_result
```

Do not store NID, TIN, bank-account numbers, passwords, employer identifiers, or original
documents in prompts, the database, logs, or version control. Store a local filename or
user-written note as an evidence reference instead.

`return-draft.json` has this shape:

```json
{
  "assessment_year": "2026-27",
  "status": "draft",
  "inputs": {},
  "evidence": {
    "salary": ["salary-certificate.pdf"],
    "source_tax": ["tax-certificate.pdf"]
  }
}
```

It deliberately has no `filed_result`. After manual submission, the user copies the
confirmed inputs and NBR result into `private/returns/2026-27.json`, then runs
`npm run eval`.

---

## 3. Assistant workflow

```text
salary certificate / bank statement / user facts
                  ↓
           structured intake
                  ↓
          return-draft.inputs
            ↙              ↘
  computeTax(config, inputs)   retrieval over current-year corpus
            ↓                         ↓
 deterministic breakdown + scenarios  cited explanation / field guidance
            ↓
 review checklist → user enters values manually in NBR e-Return
            ↓
 NBR confirmation → private/returns/<year>.json → npm run eval
```

The model may extract *candidate* values from user-provided text, but each candidate must
be labelled with its source and require confirmation before it reaches `TaxInputs`.

---

## 4. Filing coach

Build a per-year checklist from `docs/research/video-guide-portal-field-map.md` and the
current draft:

- required facts not yet present in `TaxInputs`
- required evidence for each populated input
- the e-Return tab/field where the user should enter it
- source-tax values that need portal verification
- a final manual review: assessment year, taxpayer category, income heads, payment credits,
  expenditure, wealth, and declaration

The coach can say “enter this confirmed value in this field”; it cannot say “this value is
correct” without a user-confirmed source.

---

## 5. Planning mode

Planning uses the same `computeTax()` function as filing. It never uses an LLM for math.

```text
base TaxInputs ──┬── current scenario
                 ├── investment scenario
                 └── corrected source-tax scenario
                         ↓
                  computeTax for each
                         ↓
             compare tax / payable / refund deltas
```

Allowed suggestions are factual, scoped, and explainable:

- show whether an entered eligible investment changes the rebate, and which rebate cap binds
- flag a confirmed investment category that is not represented in the draft
- show the effect of an alternative only when the user supplies the alternative amount
- flag a source-tax, expenditure, or closing-wealth mismatch for review

“Spend more to save tax” is not a valid recommendation. The UI must show the extra
outlay alongside any tax delta, and must label lifestyle expenditure as **wealth
reconciliation, not a taxable-income deduction**.

---

## 6. Personal-finance foundation

This phase records annual tax facts, not a general-purpose money app. Add broader personal
finance only after this workflow is dependable:

1. annual confirmed income, tax payments, investments, expenditure, and closing wealth
2. optional monthly spending categories that map to `LifestyleExpenditure`
3. trend views across years using user-entered totals

Do not add bank syncing, payment execution, budgeting automation, credit advice, or
portfolio recommendations in this phase. They do not improve filing correctness.

---

## 7. Implementation order

1. Define `PersonalReturnDraft` and validate draft JSON at read/write boundaries.
2. Add local draft save/load and explicit “confirm value” actions.
3. Add deterministic scenario comparison over cloned `TaxInputs`.
4. Add the evidence/document checklist and portal field guidance.
5. Add LLM explanation only after it receives: confirmed draft fields, computed breakdown,
   scenario deltas, and retrieved citations.
6. After filing, offer an export/copy into the existing replay fixture format; never create
   `filed_result` automatically.

Keep Phase 7 local-only. Any future sync or hosting needs a separate privacy and threat
model before implementation.

---

## 8. Acceptance criteria

- [ ] A confirmed local intake creates `private/ay-<year>/return-draft.json`.
- [ ] The draft converts to `TaxInputs` and produces the same result as `computeTax()`.
- [ ] Every suggestion exposes its user input, config rule, computed delta, and corpus citation.
- [ ] Planning scenarios cannot alter the base draft.
- [ ] Expenditure guidance clearly distinguishes wealth reconciliation from tax deductions.
- [ ] The assistant never creates or changes `filed_result`.
- [ ] A filed NBR result can be copied into `private/returns/<year>.json` and passes
      `npm run eval`.
- [ ] No personal identifiers or original documents leave `private/` or reach an LLM prompt.
