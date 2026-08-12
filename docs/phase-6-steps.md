# Phase 6, step by step — the learning route

Same method as Phases 3-5, with one difference: **this phase mostly assembles
things you already built.** The new thinking is in steps 1, 4, 5 and 6. The rest
is collection and rehearsal.

`docs/phases/06-polish.md` is the answer key. It was written before Phases 4 and
5 absorbed half of it — see **Errata** at the bottom before copying anything.

**Effort:** steps 1-4 and 7-11 are a weekend. The retrieval upgrades (steps 5-6)
are another. Do not start them until the baseline exists, or you will not be able
to tell whether they helped.

---

## The one idea

The answer key calls this phase "make quality measurable". That is no longer
true — measurement already exists:

| already built | from |
|---|---|
| `eval/questions.json` with `shouldRefuse` labels | Phase 4, step 4 |
| the gate, and its probe run | Phase 4, step 4 |
| citation precision, groundedness | Phase 4, step 8 |
| `verify()` — narration violations per 100 | Phase 5, step 2 |
| local vs hosted, temperature, phrasing ablations | Phase 5, step 10 |

What none of them do is **remember**. Every one of those numbers is read once,
nodded at, and forgotten. Phase 6's job:

> **A measurement you look at once is a vibe with a decimal point.**

So this phase writes the numbers down, in a committed file, and makes one command
tell you whether you just made things worse:

```
npm run eval

  replay      2/2 returns                    ✓
  retrieval   27/30 hit,  6/6 refuse          ✓
  citations   0.94 precision   baseline 0.92  ✓
  narration   0.3 viol/100     baseline 0.10  ✗  REGRESSED

  exit 1
```

That is the whole phase. Everything else — year tooling, hybrid search, the
print view — is either enabled by that gate or is honest polish.

---

## The refusal taxonomy, fixed

The answer key's test set has two outcome classes. **You need three**, and this
is the single most important correction in this phase:

| class | example | passes when |
|---|---|---|
| **answer** | "is festival bonus taxable?" | expected file in the top five |
| **scope refusal** | "what is the corporate tax rate?" | retrieves `out-of-scope.md`, model called, says what is not covered |
| **gate refusal** | "best biryani in Dhaka" | below the floor, **model never called** |

`06-polish.md:27` marks the corporate-tax question `expect_refusal: true`. That
was correct before Phase 3 split `out-of-scope.md`, and wrong ever since — it now
retrieves at rank 1 under every chunking strategy. Score it as a gate refusal and
your eval will report a failure that is actually the system working.

A two-class eval also hides the interesting bug: a system that gate-refuses
everything scores 100% on refusals.

---

## Step 1 — Write the baseline down

**Goal:** the number, and the conditions it was measured under. Before any change.

**You write:** `eval/baseline.json`, committed to git.

```json
{
  "recorded": "2026-08-12",
  "commit": "9c2559b",
  "conditions": {
    "chunking": "heading",
    "embed_model": "nomic-embed-text",
    "retrieval_floor": 0.5,
    "eval_chat_model": "<pinned, never auto>",
    "temperature": 0,
    "narration_provider": "local"
  },
  "cases": { "replay": 2, "retrieval": 30, "citations": 20, "narration": 20 },
  "retrieval":  { "hit_at_5": 0.90, "hit_at_1": 0.63, "mrr": 0.74,
                  "gate_refusal": 1.0, "scope_refusal": 1.0 },
  "generation": { "citation_precision": 0.92, "min": 0.85 },
  "narration":  { "violations_per_100": 0.10, "max": 0.50 }
}
```

**The `conditions` block is not decoration.** A baseline without the chunking
strategy, the embed model and the floor is a number with no meaning — you cannot
tell later whether the score moved because your change worked or because
`ablate.ts` left the database indexed with `sentence`. Phase 3 already burned you
once on exactly that.

**The `cases` block is the anti-cheat.** The easiest way to make a failing eval
green is to delete the failing probe. Step 4 fails the run if the case count
drops, so shrinking the test set is as loud as breaking it.

**You run:** everything you already have, at the pinned model, and fill the file
in by hand. Do not generate it — typing the numbers is how you notice the one
that is embarrassing.

---

## Step 2 — One command

**Goal:** four suites, one entry point, no arguments to remember.

```json
"eval": "tsx --env-file-if-exists=.env.local eval/run.ts"
```

Note the env flag. The current `eval` script does not have it because `replay.ts`
needs nothing; retrieval needs Postgres and Ollama, and the LLM suites need a
key. Without the flag they fail on connection errors that look like real bugs.

`eval/run.ts` runs, in this order and for a reason:

| suite | needs | seconds |
|---|---|---|
| **replay** | nothing | <1 |
| **retrieval** | Postgres + Ollama | ~20 |
| **citations** | + a chat model | ~1 min |
| **narration** | + a chat model | ~1 min |

Cheapest and most decisive first. If `replay` fails, the calculator is wrong and
nothing downstream is worth measuring — stop there and say so.

**Print one summary block at the end**, in the format at the top of this doc.
Four suites printing four differently-shaped reports is how a gate stops being
read.

---

## Step 3 — The three-class retrieval eval

**Goal:** grow the set you already have, and score it correctly.

**You write:** `eval/retrieval.ts`, reading `eval/questions.json` from Phase 4.

Two corrections to the answer key's version:

```ts
search(c.q, { year: resolveYear(c.year), limit: 5 })
```

Not `search(c.q, c.year ?? null, 5)` — wrong signature, and `null` is the
year-blind bug Phase 3 named as a finding.

Each case gets an explicit `expect`:

```ts
{ q: "…", expect: "answer",       file: "rebate.md" }
{ q: "…", expect: "scope",        file: "out-of-scope.md" }
{ q: "…", expect: "gate-refusal" }
```

**Grow it to ~30**, with at least 6 gate-refusal cases. Phase 4 noted the problem:
`ablate.ts` had exactly two junk probes, so "refusal accuracy 2/2" meant almost
nothing. Write more junk, and write *plausible* junk — "how do I register a
company?" is a better test than "best biryani", because it is tax-adjacent and
will score higher.

**Report** hit@1, hit@5, MRR, and the two refusal accuracies separately. One
blended number lets a refusal collapse hide behind good retrieval.

---

## Step 4 — The gate

**Goal:** `npm run eval` exits non-zero when you have made things worse.

**Hard fail, exit 1** — that is the point of the phase. But the four suites are
not equally deterministic, and pretending they are gives you an alarm you learn
to ignore:

| suite | rule |
|---|---|
| replay | any failure → exit 1. There is no tolerance on arithmetic. |
| retrieval | any drop below baseline → exit 1. Same embeddings, same corpus, same query = same result. |
| citations | below `generation.min` → exit 1 |
| narration | above `narration.max` → exit 1 |
| any suite | fewer cases than baseline → exit 1 |

**Why the LLM suites get a band and not an exact number.** Even at temperature 0,
a hosted router can return a different provider, and a local model can differ
across versions. The band is not softness — it is the honest measurement error.
Set `min`/`max` from what you actually observed across several runs in Phase 5,
not from a hopeful guess.

**Two rules that keep the gate meaningful:**

1. Updating a baseline is a **commit**, with a message saying what changed and
   why the number moved. A silently edited baseline is a deleted test.
2. Pin the eval model in `.env.local` — `CHAT_MODEL=auto` in an eval is a
   measurement instrument that changes itself between readings.

**You run:** the gate against a deliberately broken build. Set the floor to 0.9
and confirm it exits 1. A gate you have never seen fail is a gate you have not
tested.

---

## Step 5 — Hybrid search

**Goal:** the first improvement you can actually prove.

`docs/learn/08-explore-next.md` lists this Tier 1 for this project, and Phase 3
found the failure it targets: *"which savings schemes reduce my tax?"* misses
because the corpus says **investment** and never **savings scheme**. That is a
vocabulary gap, and embeddings do not fix vocabulary gaps — keyword search does.

Tax text is also full of exact identifiers — `IT-10B`, `6th Schedule Part 1`,
form numbers — where keyword search is unbeatable and embeddings go vague.

**You write:**

1. A `tsvector` column on `chunks` plus a GIN index. Use the `simple`
   configuration, not `english` — the terms that make keyword search worth having
   here are exact identifiers (`IT-10B`, `6th Schedule Part 1`) and proper nouns
   (Sanchayapatra, DPS). Stemming gains nothing on those and can mangle them.
2. A second query, keyword-ranked.
3. **Reciprocal Rank Fusion** to merge them: `score = Σ 1/(k + rank)`, `k = 60`.
   RRF merges *rankings*, not scores, which matters because a cosine similarity
   and a `ts_rank` are not on the same scale and averaging them is meaningless.

**The catch nobody mentions:** the fused score is no longer a cosine similarity,
so **your Phase 4 gate is now uncalibrated.** `RETRIEVAL_SCORE_FLOOR = 0.5` and
the coherence check were tuned on raw cosine. Either keep the cosine score
alongside the fused rank and gate on the cosine, or re-tune the floor and record
the new value in `conditions`. Getting this wrong makes the app refuse
everything, and the eval will tell you immediately — which is the point.

**You run:** `npm run eval`, twice, with hybrid off and on.

**Be willing to lose.** It is entirely possible that hybrid does not move hit@5
on a corpus this small and this well-curated. Record that result and keep the
code behind a flag, or delete it. A negative result you measured is worth more
than a feature you assumed.

---

## Step 6 — Re-ranking

**Goal:** the second provable improvement, and the more expensive one.

Retrieve 20 cheaply, score those 20 with a model that reads the question and the
chunk **together**, keep the best 5. A bi-encoder embedded each side without
knowing the other; a cross-encoder cannot be fooled by a chunk that merely
mentions your keyword in passing. That is exactly the festival-bonus failure.

**Two ways to get one:**

| approach | cost | privacy |
|---|---|---|
| local cross-encoder (`bge-reranker-v2-m3` or similar) | a model download, ~100ms for 20 pairs | fully local |
| LLM-as-reranker via FreeLLMAPI | one extra call, seconds | the question already goes hosted in Phase 4 — no new exposure |

Start with the LLM version if the local serving is a yak shave; it is slower and
worse but it tells you within an hour whether re-ranking is worth building
properly.

**Same calibration warning as step 5, harder.** A re-ranker's output score has no
relationship to cosine similarity at all. Keep the original cosine score on each
hit and let the gate keep using it. The re-ranker changes *order*, not the
answer-or-refuse decision.

**What to measure:** hit@1 and MRR, not hit@5. Re-ranking reorders the five you
already had — if it is helping, it shows up as the right chunk moving to the top,
not as new chunks appearing. Watch latency too, and write it into the baseline.

---

## Step 7 — Config diff

**Goal:** the highest value-per-line script in the project.

`scripts/config-diff.ts 2025-26 2026-27` — walk both configs, skip `_`-prefixed
keys, print every leaf that differs.

```
  exempt_threshold.general      375000 → 400000
  rebate.pct_of_investment      0.15   → 0.1
  rebate.absolute_cap           1000000 → 750000
```

That output *is* the "what changed this year" page. Twenty lines of code, and
genuinely the most useful thing on the site for a returning user.

**One fix over the answer key's version:** `bands` is an array, so a single rate
change prints the entire array as one unreadable blob on both sides. Walk arrays
by index and print `bands[1].rate` instead.

---

## Step 8 — Two years, side by side

**Goal:** surface the non-obvious result the whole project is best at.

Same inputs, both years, two breakdowns rendered next to each other, with the
deltas. The threshold went **up** and the rebate ceiling came **down** — so for
many salaried filers, AY 2026-27 means *more* tax despite the friendlier
headline.

No model is involved. It is `computeTax()` twice and a subtraction. That is worth
noticing: the most striking insight in the app comes from arithmetic, not AI.

Phase 5 already narrates a single breakdown; you can hand this one two, but keep
`verify()` in the path — its allowed-number set now has to be the union of both
breakdowns, which is a one-line change and an easy thing to forget.

---

## Step 9 — Rehearse the yearly ritual

**Goal:** test the claim "a new tax year costs two hours and zero code changes"
by actually doing it. Untested, it is marketing.

```
1. cp -r rules/ay-2026-27 rules/ay-2027-28
2. change three figures in config.json, edit the corpus prose to match
3. "verified": false, refresh _verify
4. npm run index
5. npm run eval          ← previous years MUST still pass
6. npx tsx scripts/config-diff.ts 2026-27 2027-28
7. delete the folder, or keep it as a fixture
```

**Time yourself.** Then write down every place you had to touch code. If the
answer is not zero, that list is your actual Phase 6 backlog — the year selector
that hardcodes two options, the eval that assumes two fixtures, the
`resolveYear()` default that needs bumping.

**The rule that makes this work:** old years are never edited. That is what keeps
the eval meaningful and stops a repealed slab from surfacing in a current-year
answer.

---

## Step 10 — Read the logs

**Goal:** close the loop. Phases 4 and 5 log every request; nobody has read them.

**You write:** `scripts/log-review.ts` — bucket the logged questions:

| bucket | means | action |
|---|---|---|
| gate-refused, repeatedly | either junk, or **a corpus gap** | write the corpus file |
| answered at 0.50-0.60 | weak retrieval, probably right by luck | write or re-cut the chunk |
| answered high, no citation used | prompt or chunking problem | Phase 4, step 5 |

The middle bucket is the valuable one. A question that scrapes past the floor is
a question the system is guessing at confidently, and it looks fine from the
outside.

**Then close it:** write the missing corpus → `npm run index` → `npm run eval`.
If hit@5 went up, add the new questions to `questions.json` and update the
baseline **in a commit that says why**. That cycle — logs to corpus to eval to
baseline — is the thing this whole project has been building toward.

---

## Step 11 — Polish

**No translation layer.** The app is English-only: one local user, no
deployment, no second audience. The answer key calls a Bangla UI toggle "the
whole point for most users" — but this project deliberately has no other users,
and that line is left over from imagining one. Dropping it also drops the
`warning_codes` refactor that existed solely to make `computeTax()`'s warning
prose translatable, so **`lib/calc/` stays untouched this phase.**

What English-only does *not* buy you is freedom from Bangladeshi number
formatting — see the four items below.

| item | note |
|---|---|
| **Number input** | accept `4,80,000`, `480000` and a pasted `480,000.00` as the same thing. Strip on input, group on display. You will type thirty of these; make it forgiving |
| **Print view** | a print stylesheet, not a PDF library. Include the year, the disclaimer, and "not an official document" |
| **Backup `private/`** | your filed returns *are* the test set — losing them loses the proof. Scripted, encrypted, off-machine |
| **Unverified banner** | both years are still `"verified": false`; it stays until you file and confirm |

---

## Deliberately not done

Recording these prevents re-litigating them later:

- **No auth / multi-user** — local only, by design
- **No hosted deployment** — personal tax data stays on the machine
- **No PDF/OCR ingestion** — the corpus stays hand-curated
- **No business income, capital gains, surcharge** — scope boundary; the app refuses
- **No filing** — this guides, it never submits
- **No "invest more to save tax" nudges** — that is Phase 7 planning mode, which
  is explicitly scoped to require the user to supply the alternative amount and to
  show the outlay next to the tax delta

---

## Done when

- [ ] `eval/baseline.json` is committed, with its `conditions` block filled in
- [ ] `npm run eval` runs all four suites from one command
- [ ] The eval exits 1 on a regression — **and you have watched it do so**
- [ ] Deleting a probe fails the run rather than improving it
- [ ] Retrieval eval scores three classes; at least 6 gate-refusal cases
- [ ] Hybrid search measured — kept or deleted on the number, not on the vibe
- [ ] Re-ranking measured on hit@1 and latency; the gate still reads the cosine score
- [ ] `config-diff.ts` prints per-band changes readably
- [ ] Two-year comparison renders, and `verify()` accepts the union of both breakdowns
- [ ] The yearly ritual has been rehearsed once, and timed
- [ ] Log review produced an actual corpus worklist
- [ ] Amount inputs accept `4,80,000` and `480000` identically
- [ ] The breakdown prints on one page, with the year and the disclaimer
- [ ] `private/` is backed up somewhere that is not this machine

---

## Errata in the answer key

`docs/phases/06-polish.md`:

| line | says | actually |
|---|---|---|
| `:27` | corporate tax → `expect_refusal: true` | scope refusal now — retrieves `out-of-scope.md` at rank 1 |
| `:45-67` | two outcome classes | three — answer / scope refusal / gate refusal |
| `:48` | `search(c.q, c.year ?? null, 5)` | `search(q, { year, limit })`, and never `null` |
| `:15` | "write the test set by hand" | it exists from Phase 4, step 4 — grow it |
| `:74` | `"eval": "tsx eval/replay.ts && tsx eval/retrieval.ts"` | needs `--env-file-if-exists=.env.local` |
| `:107` | `walk()` compares arrays whole | walk by index, or `bands` prints as one blob |
| `:164` | "Bangla UI toggle — the whole point for most users" | the app is local-only and single-user by design; **English only**, no i18n, no `warning_codes` refactor |
| `:166` | "missed deduction nudges" | Phase 7 planning mode owns this, with tighter rules |
| header | effort: a weekend | two, with the retrieval upgrades |
| throughout | "make quality measurable" | measurement exists; this phase makes it **remember** |

---

## Where each step's ideas come from

| step | source |
|---|---|
| 1, 4 | [Part 7 — Measuring](learn/07-measuring.md) — baselines, ablation discipline, one variable at a time |
| 3 | Phase 4, step 4 — the probe set and the `shouldRefuse` label |
| 5, 6 | [Part 8 — Where to go next](learn/08-explore-next.md) — hybrid search and re-ranking, both Tier 1 |
| 7, 9 | Phase 2's year-folder rule — old years are never edited |
| 10 | Phase 4, step 7 and Phase 5, step 7 — the request logs nobody has read yet |

Say **"start step 1"** when `npm run eval` runs green and you have not yet
written the number down.
