# Phase 8, step by step — the learning route

The optional phase. **The app is finished without it** — Phases 1-7 file a
return, prove the calculator, and answer questions with citations. Phase 8 adds
one capability none of them have, and it is the only phase that deliberately
relaxes a rule the project spent seven phases enforcing.

There is no answer key in `docs/phases/`. You are past the plan; if you want one
afterwards, write `docs/phases/08-agent.md` from what you actually built.

**Effort:** a weekend for steps 1-5, another for measurement and the UI. Do not
start it before Phase 6 — without the baseline you cannot tell whether the agent
is helping or just being longer.

---

## The one idea

Every feature so far answers **one question with one retrieval**:

| tab | can | cannot |
|---|---|---|
| Ask | find rule text, cite it | compute anything |
| Calculate | compute one scenario | look anything up |

Neither can answer a question that needs both, or the same tool twice:

> "Will I pay more tax next year on the same salary?"

The agent does not answer that question. It **decides what to call**:

```
step 1  computeTax(confirmed draft, 2025-26)   → net_tax   97,768
step 2  computeTax(confirmed draft, 2026-27)   → net_tax 1,02,080
step 3  configDiff(2025-26, 2026-27)           → threshold ↑ 25,000
                                                 rebate on investment 15% → 10%
step 4  search("investment rebate limit")      → rebate.md (0.81)
        ↓
"Yes — 4,312 more. The threshold rose by 25,000, but the rebate on investment
 fell from 15% to 10%, and that costs you more than the threshold saves.
 [rebate.md]"
```

Four tool calls, one answer, **and the model computed nothing.** It chose the
order; `computeTax()` produced every number.

That is the capability: **decomposition.** Not more accuracy — a different shape
of question.

---

## The rule this phase changes, stated honestly

`lib/rag/search.ts:11`, written in Phase 3:

> *"The LLM does not get to choose its own sources — it gets these five and
> nothing else. That is the property the project depends on."*

And `docs/learn/08-explore-next.md:167` lists agentic RAG as something that
**conflicts with the core rule** and that you deliberately are not using.

Phase 8 reverses that. Do it with your eyes open, and only under a narrower
version of the rule:

> **The model chooses what to ask. It never chooses what is true.**

| still absolute | now relaxed |
|---|---|
| `computeTax()` is the only arithmetic | the model picks which years to compute |
| the gate runs on every search | the model picks the search terms |
| `verify()` runs on the final text | the model calls tools more than once |
| the model may not author a `TaxInputs` value | the model decides when it has enough |

If you cannot keep the left column, stop and ship Phase 7.

---

## Step 1 — Watch it flail

**Goal:** the third time this opener has worked, and the failures are new ones.

**You write:** `scripts/agent-peek.ts` — a tool list, a question, a loop with **no
fence at all**. Let it run.

**What to look for:**

| failure | what it looks like |
|---|---|
| **rephrase spiral** | `search("rebate")`, `search("tax rebate")`, `search("rebate rules")` — three calls, same five chunks |
| **invented tool** | it calls `getTaxRate()`, which does not exist |
| **fabricated arguments** | `computeTax({ basic: 500000 })` — a number you never gave it |
| **no termination** | it keeps looking because nothing told it when to stop |
| **premature answer** | one search, then a confident answer to a two-part question |

The third one is the dangerous one and the reason step 2 exists. A model that can
invent its own tool arguments has been handed the arithmetic back through a side
door.

**Predict first:** how many steps before it either answers or loops?

---

## Step 2 — The tool contract

**Goal:** make the fabricated-argument failure impossible, not unlikely.

**You write:** `lib/agent/tools.ts` — a small, closed list. Each tool is a typed
function with validated arguments, and an unknown tool name returns an error
*message to the model*, not a thrown exception.

| tool | args | returns |
|---|---|---|
| `search` | query, year? | 5 hits, post-gate |
| `computeTax` | year, scenario? | a `Breakdown` |
| `configDiff` | yearA, yearB | changed leaves |
| `listYears` | — | available years |
| `getDraft` | year | **read-only** confirmed fields |

**The rule that carries this phase:**

> The model may not author a number that reaches `computeTax()`.

`computeTax` does not accept a `TaxInputs` object from the model. It accepts the
**confirmed draft** (Phase 7) plus an optional scenario delta whose values must
have been supplied by the user in this conversation. Reuse the provenance idea
from Phase 7: a scenario value carries `source: 'user'` or it does not run.

So *"what if I put 60,000 into DPS"* works — the user said 60,000. And *"what's
the best amount to invest"* does not, because the model would have to invent the
amount. The agent's honest reply there is a question, not an answer.

**Tool results must be small.** A `Breakdown` is large; return the fields that
matter and a handle for the rest. Context spent on JSON is context not spent on
planning.

---

## Step 3 — The fence

**Goal:** a loop that always terminates, and terminates for a reason you can name.

**You write:** `lib/agent/run.ts`

```
run(question) → { answer, trace[], stopReason }
```

| fence | why |
|---|---|
| **max 6 steps** | past that it is grinding, not reasoning |
| **dedupe identical calls** | kills the rephrase spiral outright — same tool, same args, cached result, no second charge |
| **2 consecutive tool errors → stop** | it is guessing at the API |
| **no tool → answer directly** | not every question needs a tool, and a search-first reflex wastes a call |
| **explicit `stopReason`** | `answered` · `step-limit` · `tool-errors` · `refused` |

`stopReason` is not diagnostics. A `step-limit` answer is a **partial** answer and
the UI must say so — an agent that hit the ceiling and then wrote a confident
paragraph is the exact failure this project exists to avoid.

---

## Step 4 — The trace is the product

**Goal:** Phase 4 made answers accountable with citations. Do the same for plans.

Every step records: tool, arguments, a result summary, and the score if it was a
search. The user sees it — collapsed by default, one click to open.

```
▸ 4 steps · 2 computed · 1 rule looked up          [show]
```

**Why it is not optional.** The agent's whole risk is that it chose badly — the
wrong year, a lazy query, an answer built on one weak retrieval. A citation tells
you where a fact came from; a trace tells you *what the model decided to look at
and what it ignored*. Without it you have an oracle again, which is what the
entire project was built to avoid.

It is also how you debug. Nearly every bad agent answer is a bad step 1, and the
trace makes that obvious in a second.

---

## Step 5 — The old guards, wired up

**Goal:** nothing new. But two easy places to get it wrong.

**The gate runs per search call.** The agent can search five times; each one
still faces the floor and the coherence check from Phase 4. More attempts, same
bar. A search that gate-refuses returns "nothing relevant" *to the model*, which
is information it can act on — often by asking the user instead of grinding.

**`verify()` takes the union.** Phase 5's checker built its allowed set from one
`Breakdown`. Now the allowed set is **every** `computeTax()` result the agent
received, plus the text of every chunk it retrieved. Forget the union and every
correct multi-year answer fails; build it too loosely and the check stops meaning
anything. This is the single most likely bug in the phase.

Citations come from the searches in the trace, exactly as in Phase 4 — including
the `cited` flag.

---

## Step 6 — Planning quality

**Goal:** the actual prompt work, and it is not where you expect.

**Tool descriptions matter more than the system prompt.** The model chooses from
what it reads about the tools, so a vague `search: "search the corpus"` produces
vague queries. Compare:

```
search  — find rule text in the curated tax corpus. Full questions retrieve
          much better than keywords: "how is the investment rebate calculated?"
          beats "rebate" by a wide margin. Returns nothing when the corpus does
          not cover the topic — that answer is meaningful.
```

That description encodes Phase 3's test 10 finding (0.865 vs 0.780) directly
where the model will act on it.

**Two behaviours to prompt for explicitly:**

1. **Compute before searching** when the question involves the user's own
   numbers. The breakdown usually makes the right search obvious; the reverse
   ordering wastes a step.
2. **Ask, don't assume.** A missing amount is a question for the user, not a
   value to pick.

---

## Step 7 — Refusal, again

**Goal:** the agent must be able to stop and say it cannot help.

New failure mode: a question is out of scope, every search gate-refuses, and the
agent **keeps trying different phrasings** until something scrapes past the floor.
That is a refusal converted into a bad answer by persistence.

Rule: two gate refusals in one run → stop and refuse. The dedupe from step 3
helps, but a determined rephraser gets around it, so make it explicit.

Also refuse — as a question back to the user, not an answer:

- anything needing a number the user has not supplied
- anything about heads the calculator does not cover
- "how much should I invest" and every cousin of it

---

## Step 8 — Measure

**Goal:** a fourth suite in Phase 6's `npm run eval`, and a line in the baseline.

Write ~15 **compound** probes — questions that genuinely need two or more tools:

| probe | needs |
|---|---|
| "will I pay more next year on the same salary?" | computeTax ×2, configDiff |
| "which rebate cap is binding for me, and what does the rule say?" | computeTax, search |
| "what changed this year that affects me?" | configDiff, computeTax ×2 |
| "what is the corporate tax rate?" | must refuse in ≤2 steps |

| metric | why |
|---|---|
| task success | hand-graded, ~15 cases. There is no way around reading these |
| **steps per answer** | the cheapest quality signal you have. Rising steps = degrading planning |
| tool-call precision | share of calls that contributed to the answer |
| refusal steps | a refusal should be cheap; an expensive one means it ground first |
| latency / calls | 4 model calls per question is a real cost |

Add `agent` to `eval/baseline.json` with its own `min`, and let Phase 6's gate
fail the build when it drops. Same anti-cheat: the case count is in the baseline.

---

## Step 9 — Privacy, which gets harder here

The agent's context accumulates **tool results** — and `computeTax` results are
your actual income.

**The routing rule:**

| question touches | provider |
|---|---|
| rules only (no draft, no computeTax) | hosted is allowed |
| the draft or any computed figure | **local, no exception** |

Decide the provider **before** the loop starts, from whether draft tools are
enabled for that question — not per step. A run that starts hosted and then
discovers it needs your numbers must restart locally or refuse, never "just this
once."

That is a real cost: local planning is worse than hosted planning, and this is
the phase that needs planning most. If a small local model cannot plan reliably,
the honest outcomes are a bigger local model or **no agent for personal
questions** — rules-only agent, hosted, and Calculate keeps doing what it does.
Shipping a hosted agent over your salary figures is not on the list.

---

## Step 10 — The UI

Ask tab, one addition: the collapsed trace line under the answer, and a
partial-answer badge when `stopReason !== 'answered'`.

Do not build a chat. A thread invites follow-ups that assume memory the agent does
not have, and memory is what turns this into a system with a state you cannot
audit. One question, one trace, one answer.

---

## Deliberately not done

- **No code execution, no shell, no web access** — the tool list is closed
- **No writing** — the agent never touches the draft, the corpus, or config.
  Read-only, always
- **No rule authoring** — the model never proposes a rate, a threshold or a
  config value. This is the line where the project's premise dies
- **No conversation memory** — one question, one run
- **No self-directed re-indexing or corpus edits**

---

## Done when

- [ ] The tool list is closed, and an unknown tool returns an error to the model rather than crashing
- [ ] `computeTax` cannot receive a model-authored number — a test proves it
- [ ] Every run terminates, with a `stopReason`
- [ ] Duplicate tool calls are deduped, not re-run
- [ ] The gate runs on every search; two gate refusals end the run
- [ ] `verify()` builds its allowed set from **all** breakdowns and chunks in the trace
- [ ] The trace is visible to the user, and partial answers are labelled
- [ ] ~15 compound probes are in `eval/`, with `agent` in the baseline
- [ ] Steps-per-answer is recorded and watched
- [ ] Personal questions never leave the machine — routing decided before the loop

---

## Where the ideas come from

| step | source |
|---|---|
| 2, 3 | Phase 7's provenance rule — the model proposes, it does not author |
| 5 | Phase 4's gate and Phase 5's `verify()`, reused without modification |
| 4 | Phase 4, step 5 — citations made answers accountable; the trace does it for plans |
| 6 | Phase 3, test 10 — full questions retrieve better than keywords, encoded in a tool description |
| 8 | Phase 6 — the baseline, the gate, and the anti-cheat |
| — | [Part 8 — Where to go next](learn/08-explore-next.md#agentic-and-graph-retrieval), which says not to do this. Read it again before you start |

Say **"start step 1"** when Phase 6's eval is green and you have a baseline to
compare against.
