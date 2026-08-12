# Phase 7, step by step — the learning route

The last phase, the biggest, and the only one where a model output can turn into
a number on your tax return. Same method as before: **understand first, plumbing
last** — but here the first six steps are all guard-building, because this is
where the project's core promise is actually tested.

`docs/phases/07-personal-assistant.md` is the answer key. Read it after a step.
Its acceptance criteria are stricter than any previous phase and one of them is
unachievable as written — see **Errata**.

**Effort:** not a weekend. Steps 1-6 are the core and are worth a weekend on
their own. Scenarios and the coach are another. The UI is a third. Ship 1-6 as a
CLI and use it on your own return before building any of the tab.

---

## The one idea

Look at what the model has been allowed to touch:

| phase | model reads | guard | where |
|---|---|---|---|
| 4 | public rule text | **gate** | *before* the call |
| 5 | numbers you computed | **verify()** | *after* the call |
| 7 | **your salary certificate** | **confirmation** | *between* |

Phase 7 is the first time a model's output can become a tax figure. So the guard
sits in the middle of the flow:

```
paste text  →  extract  →  proposed { value, source, span }
                                  │
                            user confirms
                                  ▼
                           confirmed { value, source, confirmedAt }
                                  │
                                  ▼
                            TaxInputs → computeTax()
```

**And it is a type, not a prompt rule.** The draft holds `Field<number>`, never a
bare `number`. `toTaxInputs(draft)` throws on anything unconfirmed. An
unconfirmed value is *structurally incapable* of reaching the calculator — the
same trick as Phase 4's gate, where an out-of-scope question was incapable of
reaching the model.

Three phases, three ways of not trusting the model, and none of them is "ask it
nicely in the system prompt."

## The second idea: extraction is retrieval inverted

In RAG you find the text and the model reads it. Here the user supplies the text
and the model must find the **numbers** in it. That inverts Phase 5's checker in
a way that turns out to be extremely useful:

> A candidate value must appear **verbatim in the source text.** If the model
> proposes `basic: 480000` and the string "480,000" is nowhere in what you
> pasted, reject the candidate before a human ever sees it.

You already have the number-normalising machinery from `lib/narrate/verify.ts` —
comma grouping, lakh/crore, Bangla digits. Point it at the input instead of the
output and it kills the whole class of *"the model quietly added two line items
on your payslip."*

---

## The privacy rules, which are different this time

Phase 5 sent a `Breakdown` with no identifiers. **A salary certificate is nothing
but identifiers** — employer, TIN, designation, sometimes an account number.

**Rule 1 — extraction is local, hard-wired.** Not an env switch like Phase 5's
narration. `lib/intake/extract.ts` constructs its own Ollama client and there is
**no hosted code path to misconfigure**. The answer key's "no personal
identifiers reach an LLM prompt" is not achievable any other way.

**Rule 2 — the raw document is never persisted.** Store the confirmed value and
the **one matched line** as an evidence excerpt. Not the whole certificate. A
paste box that forgets is safer than a file store you have to defend.

**Rule 3 — intake text is never logged.** Phases 4 and 7 both log request text,
and Phase 4's log writes the whole question. Add a redaction rule now: the My
Return routes log field names and statuses, never values, never source text.
This is the easiest privacy leak to ship by accident, because the logging was
written back when the input was "is festival bonus taxable?".

**Rule 4 — nothing personal is ever embedded.** The `chunks` table is corpus
only. No draft, no document, no intake excerpt ever gets a vector. `.gitignore`
already says this out loud — keep it true in code.

`private/` is gitignored, with `private/returns/*.example.json` as the only
exception. Verify that holds before you write a single real number.

---

## Step 1 — Watch it extract wrong

**Goal:** see the failure mode before building the defence. Third time, same
opener, and it still works.

**You write:** `scripts/intake-peek.ts` — paste a realistic salary certificate
(write a fake one with real formatting), ask a local model for `TaxInputs` JSON,
no guards at all.

**What to look for**, in rough order of how much they will scare you:

| failure | why it is dangerous |
|---|---|
| **it sums line items** | "gross salary 720,000" when the certificate lists six lines and never a total |
| **it re-labels** | conveyance moved into `other_allowances` because the certificate's wording differed |
| **it converts** | monthly figure quietly annualised, or the reverse |
| **it fills gaps** | `source_tax: 0` when the certificate simply doesn't mention it |

The first is the one that matters. It is *arithmetic*, it is *usually right*, and
this project's entire premise is that the model does not do arithmetic. The
fourth is subtler: a confident `0` is a claim, not an absence.

**Predict first:** how many of the four will you see in one run?

---

## Step 2 — The verbatim checker

**Goal:** reject candidates mechanically, before a human looks at them.

**You write:** `lib/intake/verify-candidate.ts`

```
checkCandidate(value: number, sourceText: string)
  → { present: boolean, span?: [start, end], matchedAs?: string }
```

Reuse the normalisation from Phase 5: `480,000` · `4,80,000` · `4.8 lakh` ·
Bangla-Indic digits all match `480000`. **The app is English-only; the documents
are not** — a salary certificate or a portal screenshot can carry Bangla numerals
regardless of what your UI speaks, and an unrecognised numeral reads as no number
at all, which fails silently. Return the **span**, not just a boolean —
step 5 needs it to show the user the exact line the number came from, and a
citation you can point at is worth ten you assert.

**The rule:** not present verbatim → the candidate is dropped, not shown. A
summed total is by definition not in the text, so this single check kills failure
mode 1 outright.

**The exception you must handle deliberately:** a certificate that legitimately
*does* print a total. Then the total is verbatim and passes — correctly. What you
are rejecting is arithmetic the model invented, not arithmetic the employer
printed. Worth being clear about, because it explains why the check is sound
rather than merely strict.

**You run:** it over step 1's output. Anything it does not reject, you now have
to explain.

---

## Step 3 — The draft type

**Goal:** make "unconfirmed" un-computable.

**You write:** `lib/intake/draft.ts`

```ts
type FieldStatus = 'proposed' | 'confirmed' | 'user-entered' | 'rejected'

interface Field<T> {
  value: T
  status: FieldStatus
  source: { kind: 'extracted' | 'user'; excerpt?: string; span?: [number, number] }
  confirmedAt?: string
}

interface PersonalReturnDraft {
  assessment_year: string
  status: 'draft'
  fields: { /* the TaxInputs shape, every leaf wrapped in Field<> */ }
  evidence: Record<string, string[]>   // filenames or user notes, never contents
}
```

And the function that is the whole point:

```ts
toTaxInputs(draft): TaxInputs   // throws, listing every unconfirmed field
```

**No `filed_result` in this type. Ever.** That field exists only in
`private/returns/<year>.json`, written by hand after filing. The draft type not
having the field is a stronger guarantee than a rule saying don't fill it in.

**Validate at the boundary** — every read and write of draft JSON goes through a
validator. Hand-roll it; the project runs on two dependencies and a 60-line
checker keeps it that way. (`zod` is the obvious alternative if you would rather
not maintain it.)

---

## Step 4 — The extractor

**Goal:** candidates with provenance, from a local model only.

**You write:** `lib/intake/extract.ts` — its own Ollama client, constructed
in-file, no `NARRATION_PROVIDER`-style switch and no hosted branch to
accidentally enable.

**Extract one group at a time**, not the whole `TaxInputs` in one call:

```
salary lines → other income → rebate investment → taxes paid → expenditure → wealth
```

Accuracy is better on a narrow ask, the prompt can name the exact fields, and —
more importantly — the confirmation UX in step 5 works group by group, which is
the only way a 30-field form is bearable to review.

Every candidate comes back as `{ field, value, excerpt }`, runs through step 2,
and arrives as `status: 'proposed'`. **The extractor never writes to the draft.**
It returns candidates; step 5 commits them.

**The prompt rule that matters:** *if a value is not printed in the text, omit the
field.* Do not let it emit `0`. An absent field and a zero are different claims,
and only one of them is honest.

---

## Step 5 — Confirmation

**Goal:** the human step, built as a CLI before it is built as a UI.

**You write:** `scripts/intake.ts` — for each candidate, print the field, the
value, and the **source line with the match highlighted**, then: accept / edit /
reject / skip.

Editing sets `status: 'user-entered'` and `source.kind: 'user'`. That distinction
survives into the checklist and the explanation — "you typed this" and "the
certificate said this" are different levels of evidence, and the filing coach
should treat them differently.

**Design point worth thinking about before you build it:** confirming 30 fields
one by one is tedious, and tedium produces rubber-stamping — which defeats the
entire guard. Options: group-level confirm with per-field override, confirm-all
for a group where every candidate passed verbatim, or ordering by amount so the
big numbers get real attention. Pick one and write down why. **A guard people
click through is not a guard.**

---

## Step 6 — The store

**Goal:** durable local state, and a hard wall between draft and filed.

```
private/
  profile.json                 stable preferences, no NID/TIN
  ay-2026-27/
    return-draft.json          Field<>-wrapped draft
    intake.json                confirmed excerpts, never whole documents
    scenarios/*.json
    documents.md               checklist + local file references
  returns/
    2026-27.json               AFTER filing only: inputs + NBR's filed_result
```

Atomic writes (temp file then rename) — a half-written draft after a crash is
worse than no draft. Never write to `private/returns/` from application code at
all; step 11 is a deliberate, manual export.

**At this point stop and use it.** Run your own certificate through steps 1-6
before building anything else. Everything after this is easier to design once you
know what confirming your own real numbers actually feels like.

---

## Step 7 — Scenarios

**Goal:** planning that cannot lie, because no model is involved.

```
base draft ──┬── current
             ├── more DPS (user supplies the amount)
             └── corrected source tax
                     ↓
              computeTax() for each
                     ↓
              tax / payable / refund deltas
```

**Clone, never mutate.** Write the test first: snapshot the draft, run every
scenario, deep-equal the snapshot. The answer key makes this an acceptance
criterion; make it a test.

**Allowed suggestions** — factual, scoped, each traceable to a rule:

- whether an entered investment changes the rebate, and **which cap binds**
  (`rebate_binding`, straight from Phase 5's templates)
- a confirmed investment category not represented in the draft
- the effect of an alternative **only when the user supplies the amount**
- a source-tax, expenditure or closing-wealth mismatch worth reviewing

**"Spend more to save tax" is not a recommendation.** Show the extra outlay next
to the tax delta, always, in the same row. Spending 100,000 to save 7,500 is a
choice a user can make with their eyes open, and a UI that shows only the 7,500
is lying by layout.

And label lifestyle expenditure as **wealth reconciliation, not a deduction** —
right there in the scenario view, not in a footnote.

---

## Step 8 — The filing coach

**Goal:** a checklist, generated deterministically.

Source: `docs/research/video-guide-portal-field-map.md` — 14 sections of real
portal structure, already transcribed. Cross it with the draft:

| check | output |
|---|---|
| required fact missing | "Assessment tab needs taxpayer category" |
| populated input with no evidence | "salary confirmed, no certificate referenced" |
| where to type it | the e-Return tab and field name |
| source tax needs portal verification | flag it — the corpus has a file on exactly this |
| final review | AY, category, heads, credits, expenditure, wealth, declaration |

**The coach's limit, stated exactly:** it can say *"enter this confirmed value in
this field."* It cannot say *"this value is correct."* The first is navigation;
the second is an audit it is not qualified to perform.

No model needed for any of this. The model may phrase it; the content is a join
between two data structures.

---

## Step 9 — Explanation, last

**Goal:** the LLM's turn, and it is the smallest step in the phase.

It runs only after it has: confirmed fields, a computed breakdown, scenario
deltas, and retrieved citations. Nothing new gets written — you already have
`ask()` from Phase 4 for the cited rules and `verify()` from Phase 5 for the
numbers, and **both guards apply unchanged.**

That is the payoff for four phases of discipline: the flashiest feature in the
project is a hundred lines, because everything dangerous about it was already
solved.

**One addition:** the explanation must show *field provenance* — "your basic pay,
which you confirmed from your salary certificate" reads differently from "the
figure you typed", and the draft already knows which is which.

---

## Step 10 — The My Return tab

**Goal:** the workspace. Separate from Calculate, deliberately.

**Calculate stays a stateless what-if tool.** My Return is the stateful,
evidence-backed draft. Keeping them apart means a user can never confuse a quick
estimate with the numbers they are about to file — and Calculate stays usable
without any personal data on disk.

```
My Return
  ├── Intake      paste box → candidates → confirm (step 5's CLI, with a face)
  ├── Draft       Field-status per row, breakdown, warnings
  ├── Scenarios   side by side, outlay column always visible
  └── Checklist   from step 8, grouped by e-Return tab
```

**The one non-negotiable UI rule:** an unconfirmed value never appears in the
breakdown. Not greyed out, not with an asterisk — absent, with the field shown as
pending. The moment a proposed number renders next to real ones in a total, the
type guard you built in step 3 has been undone by CSS.

Show status per field: extracted-and-confirmed, typed by you, still pending.

---

## Step 11 — After filing

**Goal:** close the loop that started in Phase 1.

1. File on the NBR portal, manually. This app does not submit.
2. **Transcribe NBR's result by hand** into `private/returns/2026-27.json`
3. `npm run eval` — Phase 6's gate now has one more real return in it

**`filed_result` is never written by code.** It is evidence, and evidence you
generated yourself is not evidence. If the app computed it and the replay eval
then checked against it, the test would be the calculator grading its own
homework — which is precisely the failure mode this project was built to avoid.

If replay fails against the real filed numbers: **the calculator is wrong.** That
is the most valuable output this project can produce, and it only exists because
you kept the two numbers independent.

---

## Deliberately not in this phase

- **No bank syncing, budgeting, portfolio or credit features** — none of them
  improve filing correctness
- **No multi-year trend views** — answer key §6 gates these behind "after this
  workflow is dependable", and it is not dependable until you have filed with it
- **No OCR or file upload** — paste text only; the extraction interface is shaped
  so OCR could feed it later without rework
- **No hosted extraction, ever** — not a config option, not a code path
- **No sync, no hosting** — either needs its own threat model first

---

## Done when

- [ ] `toTaxInputs()` throws on an unconfirmed field, and a test proves it
- [ ] A candidate value absent from the source text never reaches the user
- [ ] Extraction has no hosted code path — grep the file and confirm
- [ ] Intake text and field values never appear in any log
- [ ] Nothing personal is ever embedded or written to Postgres
- [ ] The raw pasted document is not persisted; only matched excerpts are
- [ ] Scenarios cannot mutate the base draft — snapshot test
- [ ] Every suggestion shows its input, rule, delta and citation
- [ ] Any tax delta is displayed next to its outlay
- [ ] Expenditure is labelled wealth reconciliation, not a deduction
- [ ] Unconfirmed values are absent from the breakdown, not styled differently
- [ ] `filed_result` is never written by code
- [ ] A real filed return replays under `npm run eval`

---

## Errata in the answer key

`docs/phases/07-personal-assistant.md`:

| section | says | actually |
|---|---|---|
| §8 | "no personal identifiers reach an LLM prompt" | unachievable unless extraction is **local-only and hard-wired** — state it as a rule, not a hope |
| §3 | inputs are "salary certificate / bank statement" | paste-text only in this build; Phase 6 ruled out OCR |
| §2 | layout has no home for source text | `intake.json` holds **matched excerpts**, never whole documents |
| §8 | "the draft converts to `TaxInputs` and produces the same result as `computeTax()`" | tautological — the real criterion is that unconfirmed fields **cannot** convert |
| — | silent on logging | Phases 4 and 5 log request text; My Return needs an explicit redaction rule |
| — | silent on the vector DB | say it plainly: no draft or document is ever embedded |
| §7 | 6 implementation steps | the guards (verbatim check, `Field<>` type) come *before* the extractor, not after |

---

## Where each step's ideas come from

| step | source |
|---|---|
| 1 | Phases 4 and 5 both opened by watching the model fail — it works because prediction beats explanation |
| 2 | Phase 5, step 2 — `verify()`, pointed at the input instead of the output |
| 3 | Phase 4's gate — policy as a structural boundary, not an instruction |
| 7 | Phase 1's `computeTax()` — unchanged, and still the only thing allowed to do arithmetic |
| 8 | [`research/video-guide-portal-field-map.md`](research/video-guide-portal-field-map.md) — 14 sections of real portal structure |
| 9 | Phase 4's `ask()` and Phase 5's `verify()`, reused without modification |
| 11 | Phase 1's replay eval — the oracle was always NBR, never this app |

Say **"start step 1"** when you have a fake salary certificate written out with
realistic formatting.
