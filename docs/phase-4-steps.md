# Phase 4, step by step — the learning route

Same method as Phase 3: **understand first, plumbing last.** Each step runs on
its own and teaches one idea. The API route is step 7, not step 1, because by
then there is nothing left to think about.

`docs/phases/04-ask-tab.md` is the answer key. Read it *after* a step, never
before — the point is to hit the problem yourself first. It has known-stale code;
see **Errata** at the bottom before you copy anything out of it.

---

## What Phase 4 produces

One function: **question in, cited answer out — or a refusal.**

```
question (+ year, optional)
    │
    ▼
  resolve the year          ← never search year-blind (Phase 3, finding 2)
    │
    ▼
  search()                  ← Phase 3, already done
    │
    ▼
  the gate      ─── refuse ──▶  "I don't cover that"   (model never called)
    │
    ▼
  build a prompt with the 5 chunks
    │
    ▼
  LLM writes the answer — or refuses from the context it was given
    │
    ▼
  { answer, citations[], retrieval{} }
```

Note there are **two** different refusals, and they are not the same thing:

| refusal | when | model called? | example |
|---|---|---|---|
| **gate refusal** | nothing relevant was retrieved | **no** | "best biryani in Dhaka" |
| **scope refusal** | `out-of-scope.md` *was* retrieved | yes | "what is the corporate tax rate?" |

The second one is better UX — it can explain *why* the app can't help, and cite
the file that says so. Phase 3 built that on purpose by splitting
`shared/corpus/out-of-scope.md` into one heading per excluded topic. Do not try
to make the gate catch it; you would be undoing Phase 3's best fix.

The two guards — the gate and the grounding prompt — are the whole phase. The
rest is wiring.

---

## Before you start: FreeLLMAPI

FreeLLMAPI is a **separate service**, in the same category as your Postgres
container. bd-tax talks to it over HTTP and never imports its code.

```
bd-tax  ──HTTP :11434──▶  Ollama       embeddings   (local, private)
        ──HTTP :5433 ──▶  Postgres     pgvector
        ──HTTP :3001 ──▶  FreeLLMAPI   generation   (routes to 29 providers)
```

### Install

```bash
curl -fsSL https://freellmapi.co/install.sh | bash
```

Docker required. Sets up `~/freellmapi`, generates an encryption key, pulls the
image, starts the container. Safe to re-run.

Then:

1. Open <http://localhost:3001>
2. **Keys** page → add at least one provider key (Groq and Google are the easiest free tiers)
3. Copy the **unified key** from the Keys page header — that is what bd-tax uses

### `.env.local`

The keys are already documented in `.env.local.example` under
*Generation — hosted*. Copy that section across and fill in `FREELLMAPI_KEY`.
Step 4 also uses `RETRIEVAL_SCORE_FLOOR`, which is in the same file.

Add one new line for the year default:

```bash
# Assessment year used when a request does not specify one.
# Leave unset to auto-pick the newest rules/ay-* folder.
DEFAULT_ASSESSMENT_YEAR=2026-27
```

`CHAT_MODEL=auto` lets the router pick a model and fail over when one is
rate-limited. Fine for the app. **Not fine for steps 3 and 7** — see the pinning
rule below. Embeddings stay pinned always.

### Do you need the git clone?

**No.** The one-liner runs a prebuilt image; the clone is only useful if you want
to read the source or run it in development mode. It is not a dependency of
bd-tax and does not belong inside this repo.

### Verify before writing any code

`.env.local` is read by `tsx`, not by your shell, so `$FREELLMAPI_KEY` is empty
in a terminal. Paste the key inline:

```bash
curl http://localhost:3001/v1/models -H "Authorization: Bearer <paste-key-here>" | head
```

A JSON list of models means you are ready. Anything else is a setup problem, and
you want to hit it now rather than inside step 1.

---

## The rule that does not change

> **It is a calculator with a librarian attached. The AI is only the voice.**

In Phase 4 that becomes three hard constraints:

| the model may | the model may not |
|---|---|
| explain a rule in plain words | decide what a rule is |
| quote a number from a chunk | compute a number |
| say it doesn't know | guess when unsure |
| cite the file it used | choose which files to look at |

**Embeddings never go to FreeLLMAPI.** `EMBED_MODEL` stays pointed at Ollama.
Personal figures stay on your machine; only public rule text and anonymised
derived values ever reach a hosted provider. Never send NID, TIN, bank account
numbers, employer names, addresses, or phone numbers to any model.

### Pin the model whenever you are measuring

`CHAT_MODEL=auto` can answer from a different provider on every call. That is a
feature in the app and a bug in an experiment — you cannot A/B a prompt if the
model changed underneath you. In steps 3 and 7, pin it:

```bash
CHAT_MODEL=llama-3.3-70b-versatile npm run ask:lab -- "…"
```

Use `auto` everywhere else.

---

## Step 1 — Watch it lie

**Goal:** see why grounding is necessary, before building any of it.

**You write:** `lib/llm/client.ts` (mirror of `lib/rag/embed.ts`, different
provider), `scripts/llm-peek.ts`.

**Also add to `package.json`** — every script that reads `.env.local` needs the
flag, or `FREELLMAPI_KEY` is `undefined` and you debug the wrong problem:

```json
"llm:peek": "tsx --env-file-if-exists=.env.local scripts/llm-peek.ts"
```

**You run:**

```bash
npm run llm:peek -- "what is the tax-free threshold in Bangladesh for 2026-27?"
```

(The `--` matters — same convention as `npm run search`.)

**What to look for:** a confident, well-formatted, specific number — with **no
retrieval, no context, no corpus**. Then check it against
`rules/ay-2026-27/config.json`.

It may be right. It may be wrong. **You have no way to tell from the answer**,
and neither does a user. That is the problem the rest of the phase solves.

(That config is itself `"verified": false` — it is your reference, not truth.
Being unable to check the model against a *verified* number is part of the point.)

**You also meet:** what the chat API returns, `messages` and roles, tokens,
`temperature`, and why `CHAT_MODEL=auto` can answer from a different provider
each time.

**Predict first:** will it refuse, hedge, or state a number?

---

## Step 2 — Ground it by hand

**Goal:** see RAG work, with no new infrastructure.

**You write:** `scripts/ask-lab.ts` — resolve the year, call `search()`, paste
the five chunks into a prompt string, call the model. Register it as `ask:lab`
with the same `--env-file-if-exists` flag.

Mind the real signature — it takes an options object, not positional args:

```ts
search(question, { year, limit: 5 })   // lib/rag/search.ts
```

**You run:** the same question twice.

```
no context   → answer A
5 chunks     → answer B
```

**What to look for:** whether B actually uses the corpus wording, and whether the
number matches your config. This is the moment RAG stops being a diagram.

**Why it matters:** you are string-concatenating on purpose. Every RAG framework
hides this step, and it is the step where the real decisions live.

---

## Step 3 — The prompt lab

**Goal:** find out how much the instruction is worth. This is Phase 4's
equivalent of the chunking ablation. **Pin `CHAT_MODEL` first.**

**You run:** the same question, the same five chunks, five instructions:

| variant | question it answers |
|---|---|
| no rules at all | does it stay grounded on its own? |
| "answer only from the context below" | is one sentence enough? |
| + "cite the source file" | do the citations match reality? |
| + "if the context does not contain the answer, say so" | does it actually refuse? |
| + "never calculate an amount — send them to the Calculate tab" | does it resist arithmetic? |

**Two adversarial probes, not one:**

1. Hand it five chunks that **do not** contain the answer. Does it admit that, or
   invent something?
2. Ask **"how much tax do I owe on 8 lakh?"** with the slab chunks attached.
   Everything it needs to do the arithmetic is right there in the context, which
   is exactly why it will try. This is the probe that earns variant 5.

**What to look for:** citations that name a file the answer did not come from.
Models cite the first chunk by habit. This is a real failure mode, and you cannot
see it without checking by hand.

**Output of this step:** the winning instruction set, written down. Step 5 turns
it into a file.

---

## Step 4 — The gate (no model at all)

**Goal:** decide answer-or-refuse in deterministic code.

**You write:** `lib/rag/gate.ts` — pure function, search results in, decision out.
Import `SCORE_FLOOR` from `lib/rag/search.ts`; do not declare a third copy of it.

```
floor check       top score above RETRIEVAL_SCORE_FLOOR (0.5)?
coherence check   do the five rows agree on a source file?
```

**Why not a spread threshold.** The obvious idea is "refuse when rank 1 − rank 5
is small". Phase 3 measured it, and it is wrong on its own:

```
"money I get from renting out my flat"   0.613   spread 0.017   ← CORRECT
"what is the corporate tax rate?"        0.623   spread 0.047   ← was WRONG
"best biryani restaurant in Dhaka"       0.392   spread 0.011   ← junk
```

The **correct** answer has the *smallest* spread of the three. Any "spread must
exceed 0.05" rule refuses it. Flatness is not failure — flatness *plus
disagreement* is (`docs/learn/06-retrieval.md:171-184`):

| | 5 rows, one topic | 5 rows, scattered |
|---|---|---|
| **big spread** | found one specific answer | found one specific answer |
| **tiny spread** | topic is dense — several fair answers | **found nothing** |

So the second signal is **coherence**, not spread: how many of the five rows
share a source file. The renting question had all five in `house-property.md`;
the failed ones were scattered across three. Spread is still worth returning as a
diagnostic — just don't gate on it alone.

**What the gate is not for.** "What is the corporate tax rate?" now retrieves
`out-of-scope.md` at rank 1 under every strategy — high score, coherent. The gate
**passes it**, and the model refuses from the scope chunk with a citation. That
is the designed behaviour. The gate exists for junk, not for scope.

**Before you can measure:** `PROBES` is a local `const` in `scripts/ablate.ts:42`
and only two of the thirty are labelled `expect: null`. Extract them to
`eval/questions.json` (which `ablate.ts:14` already names as the plan) and add
one field:

```ts
shouldRefuse: boolean   // true only for junk — NOT for out-of-scope.md probes
```

**You run:** the gate against those probes. No model calls, so it is instant and
free.

**What to look for:** how many junk questions correctly refuse, and whether any
*good* question gets refused. Both matter — a gate that refuses everything scores
perfectly on the first count. Be honest that with two junk probes the first
number is nearly meaningless; write four or five more before you trust it.

**Why this is code, not a prompt:** policy you can test is worth more than policy
you have to ask a model to follow. This function is deterministic, free, and
runs in microseconds.

---

## Step 5 — The prompt module and the pipeline

**Goal:** turn steps 2-4 into the one function the route will call. Nothing new
is decided here — you are only moving decisions into files.

**You write three things:**

`lib/rag/year.ts`

```
resolveYear(requested?: string): string
```

Year is **optional in the request and never optional in the query.** If the
caller gives one, use it. Otherwise fall back to `DEFAULT_ASSESSMENT_YEAR`, and
if that is unset, the newest `rules/ay-*` folder on disk. Throw if the resolved
year has no folder. Phase 3, finding 2: a year-blind search silently prefers
2025-26 and looks perfectly healthy while quoting last year's rates. Passing
`null` through to `search()` is the bug this function exists to prevent. Return
the resolved year to the caller so the UI can show which year it answered for.

`lib/rag/prompt.ts` — `SYSTEM_PROMPT` (the winner from step 3),
`buildContext(hits)`, `buildUserMessage(question, hits)`.

`lib/rag/ask.ts` — the pipeline, and the only thing the route calls:

```
ask({ question, year? })
  → resolveYear → search → gate → prompt → model
  → { answer, citations, retrieval }
```

Keep it independent of Next. It should be callable from a script, which is how
you test it before any route exists.

**The return shape:**

```ts
{
  answer: string
  citations: { sourceFile: string; heading: string; score: number; cited: boolean }[]
  retrieval: { year: string; bestScore: number; spread: number; coherence: number
               floor: number; modelCalled: boolean }
}
```

`citations` is the retrieved five, in rank order. `cited` is set by parsing the
`[file.md]` markers out of the model's own text and matching them back. **That
flag is the whole point of the step** — if you just return all five hits, you can
never tell whether the model used the chunk it named. Ask a question whose answer
is only in chunk 4 and see whether chunk 4 comes back `cited: true`, or chunk 1
does.

**Why it matters:** a citation nobody checks is decoration. This is the property
that makes the whole design defensible — a user can open
`rules/ay-2025-26/corpus/rebate.md` and read the rule themselves.

---

## Step 6 — Scaffold Next (read this before step 7)

**This repo has no web app yet.** No `next`, no `react` in `package.json`, no
`app/` directory, and `tsconfig.json` has no `jsx` setting. Step 7 cannot be
"boring wiring" until this exists, so do it as its own step and don't kid
yourself that it is part of the route.

```bash
npm i next react react-dom
npm i -D @types/react @types/react-dom
```

Then add to `tsconfig.json`: `"jsx": "preserve"`, `"dom"` in `lib`, and
`"plugins": [{ "name": "next" }]`. `include` already covers `app/**/*` and
`paths` already maps `@/*`.

**No UI in this phase.** `docs/phases/00-overview.md:46` gives `app/` UI to Phase
5, and that split is right — Phase 5 is where layout work belongs. Phase 4 ends
at a route you drive with `curl`.

**If you would rather not install Next yet:** skip this step entirely and write
`scripts/ask-cli.ts` instead. `lib/rag/ask.ts` does not care, and Phase 5 can
build the route and the UI together. You lose nothing from the phase except the
streaming plumbing.

---

## Step 7 — The API route

**Goal:** wire it up. This should feel boring.

**You write:** `app/api/ask/route.ts` — parse the request, call `ask()`, stream
the response. Validate that `question` is a string of at least 3 characters;
`year` is optional and goes straight to `resolveYear`.

**Streaming details worth getting right:**

- Send the citations and `retrieval` block as the first SSE frame, so the UI can
  show sources before the text arrives.
- Emit an `error` frame if the provider dies mid-stream. `auto` fails over
  *between* calls, not inside a broken one, so without this the client hangs
  forever waiting for `[DONE]`.

**Also:** log every request with its scores and whether the model was called —
including on the streaming path, which is the easy one to forget.

```json
{ "at": "…", "question": "…", "year": "2026-27", "bestScore": 0.613,
  "spread": 0.017, "coherence": 5, "modelCalled": true,
  "chunks": [{ "file": "house-property.md", "score": 0.613 }] }
```

That log is how you tune the floor with real questions instead of guesses.

**Why last:** all the thinking already happened in steps 1-5. If this step feels
hard, something earlier was skipped.

---

## Step 8 — Measure

**Goal:** the Phase 3 habit, applied to answers.

Retrieval asked *"did we find the right chunk?"* Generation asks *"did the answer
come from the chunk, or did the model invent it?"* Different question, different
metrics.

**Pick the metrics before you run anything.** Phase 3 had MRR and hit@5; without
an equivalent here you are just reading answers and nodding. Two that work:

| metric | how | cost |
|---|---|---|
| **citation precision** | share of `[file.md]` markers that name a file actually in the top five | code, free |
| **groundedness** | hand-grade 10 probes: is every claim traceable to a chunk? | ~20 min per run |

Citation precision is computable and catches the "cites chunk 1 by habit" bug.
Groundedness needs your eyes. Run both; a script cannot tell you the answer was
fluent and subtly wrong.

**Ablations worth running** (pin `CHAT_MODEL` for all of them):

| variable | question | cost |
|---|---|---|
| 3 vs 5 vs 8 chunks | does more context help, or add noise? | cheap |
| temperature 0 vs 0.7 | does lower temperature reduce invention? | cheap |
| prompt variants from step 3 | which instruction earns its place? | cheap |
| chunking strategy | does `sentence` still lose once answers are judged? | **expensive** |

That last one matters. Phase 3 chose `heading` over `sentence` partly on the
argument that 270 words of context beats 120. **Step 8 is where you find out
whether that argument was right** — you never actually measured it.

Two warnings on it: it re-indexes the entire corpus per strategy *and* makes one
model call per probe, which free tiers will rate-limit; and `ablate.ts` leaves
the database indexed with whichever strategy ran last. Re-run `npm run index`
before you use the app again.

---

## Test these five by hand

| # | question | expected |
|---|---|---|
| 1 | "how is the rebate calculated for 2026-27?" | cited answer, right year |
| 2 | "how do I submit my return?" | answer from `shared/`, year resolved but unused |
| 3 | "what is the corporate tax rate?" | **scope refusal citing `out-of-scope.md`** — model called |
| 4 | "best biryani in Dhaka" | **gate refusal** — model never called (check the log) |
| 5 | "how much tax do I owe on 8 lakh?" | redirect to Calculate, **never computed by the model** |

Cases 3 and 4 are both refusals and they take different paths. If case 3 comes
back as a bare gate refusal, your gate is too aggressive — check coherence, not
spread.

Case 5 is the one people get wrong. The slab chunks in the context contain
everything needed for the arithmetic, and the model will happily do it. It must
not.

Case 2 with no year in the request is also the year-default test: the log must
show a concrete `year`, never `null`.

---

## Done when

- [ ] Answers cite at least one source file, and `cited` reflects what the model actually named
- [ ] **Junk** questions are refused **without calling the model** (check the log)
- [ ] **Out-of-scope** questions are answered from `out-of-scope.md` and say what the app does not cover
- [ ] "How much do I owe" redirects to Calculate rather than computing
- [ ] A request with no year resolves to the current assessment year — `search()` is never called year-blind
- [ ] Year filtering works — the 2026-27 selector never returns 2025-26 rule chunks
- [ ] Streaming works over `curl`, including an error frame when the provider dies (UI is Phase 5)
- [ ] Every request is logged with year, scores and `modelCalled`

---

## Errata in the answer key

`docs/phases/04-ask-tab.md` predates the code. Do not copy these:

| line | says | actually |
|---|---|---|
| `:131` | `search(question, assessmentYear ?? null, 5)` | `search(question, { year, limit: 5 })` — and never `null` |
| `:89` | `import type { Hit }` | the export is `SearchHit` |
| `:105` | `h.heading ?? ''` | `heading` is already `string` |
| `:122` | redeclares `FLOOR` | `SCORE_FLOOR` is exported from `lib/rag/search.ts:91` |
| `:135` | floor check only | plus the coherence check — step 4 |
| `:154` | `citations` as a deduped string list | objects with `cited` — step 5 |
| `:182` | log block shown separately | must be wired into the route, streaming path included |
| `:205` | corporate tax → "model never called" | superseded by the `out-of-scope.md` split |

---

## Where each step's ideas come from

| step | learn doc |
|---|---|
| 1, 2 | [Part 1 — Why search is hard](learn/01-why-search-is-hard.md) — the RAG loop and why the model needs your facts |
| 3, 5 | new ground: prompt design and grounded generation |
| 4 | [Part 6 — Retrieval](learn/06-retrieval.md) — the floor, the spread, the three signals |
| 8 | [Part 7 — Measuring](learn/07-measuring.md) — ablation method, ceiling effects, proxy metrics |

Say **"start step 1"** when FreeLLMAPI answers that `curl`.
