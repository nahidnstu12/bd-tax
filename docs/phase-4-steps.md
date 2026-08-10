# Phase 4, step by step — the learning route

Same method as Phase 3: **understand first, plumbing last.** Each step runs on
its own and teaches one idea. The API route is step 6, not step 1, because by
then there is nothing left to think about.

`docs/phases/04-ask-tab.md` is the answer key. Read it *after* a step, never
before — the point is to hit the problem yourself first.

---

## What Phase 4 produces

One function: **question in, cited answer out — or a refusal.**

```
question + year
    │
    ▼
  search()                     ← Phase 3, already done
    │
    ▼
  the gate        ─── refuse ──▶  "I don't cover that"   (model never called)
    │
    ▼
  build a prompt with the 5 chunks
    │
    ▼
  LLM writes the answer
    │
    ▼
  { answer, citations[] }
```

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

```bash
FREELLMAPI_BASE_URL=http://localhost:3001/v1
FREELLMAPI_KEY=<unified key from the Keys page header>
CHAT_MODEL=auto
```

`auto` lets the router pick a model and fail over when one is rate-limited. Fine
for generation. Embeddings stay pinned — see the rule below.

### Do you need the git clone?

**No.** The one-liner runs a prebuilt image; the clone is only useful if you want
to read the source or run it in development mode. It is not a dependency of
bd-tax and does not belong inside this repo.

### Verify before writing any code

```bash
curl http://localhost:3001/v1/models -H "Authorization: Bearer $FREELLMAPI_KEY" | head
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

---

## Step 1 — Watch it lie

**Goal:** see why grounding is necessary, before building any of it.

**You write:** `lib/llm/client.ts` (mirror of `lib/rag/embed.ts`, different
provider), `scripts/llm-peek.ts`.

**You run:**

```bash
npm run llm:peek "what is the tax-free threshold in Bangladesh for 2026-27?"
```

**What to look for:** a confident, well-formatted, specific number — with **no
retrieval, no context, no corpus**. Then check it against
`rules/ay-2026-27/config.json`.

It may be right. It may be wrong. **You have no way to tell from the answer**,
and neither does a user. That is the problem the rest of the phase solves.

**You also meet:** what the chat API returns, `messages` and roles, tokens,
`temperature`, and why `CHAT_MODEL=auto` can answer from a different provider
each time.

**Predict first:** will it refuse, hedge, or state a number?

---

## Step 2 — Ground it by hand

**Goal:** see RAG work, with no new infrastructure.

**You write:** `scripts/ask-lab.ts` — call `search()`, paste the five chunks into
a prompt string, call the model.

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
equivalent of the chunking ablation.

**You run:** the same question, the same five chunks, four instructions:

| variant | question it answers |
|---|---|
| no rules at all | does it stay grounded on its own? |
| "answer only from the context below" | is one sentence enough? |
| + "cite the source file" | do the citations match reality? |
| + "if the context does not contain the answer, say so" | does it actually refuse? |

**Then the real test:** hand it five chunks that **do not** contain the answer.
Does it admit that, or invent something?

**What to look for:** citations that name a file the answer did not come from.
Models cite the first chunk by habit. This is a real failure mode, and you cannot
see it without checking by hand.

---

## Step 4 — The gate (no model at all)

**Goal:** decide answer-or-refuse in deterministic code.

**You write:** `lib/rag/gate.ts` — pure function, search results in, decision out.

```
floor check    top score above RETRIEVAL_SCORE_FLOOR (0.5)?
spread check   rank1 − rank5 above ~0.05?
```

**Why both:** Phase 3 measured that the floor alone is not enough.

```
"money I get from renting out my flat"   0.613   ← CORRECT
"what is the corporate tax rate?"        0.623   ← WRONG, scored HIGHER
```

One threshold on one number cannot separate them. The spread can: 0.017 with all
five rows from one file, versus 0.047 scattered across three.

**You run:** the gate against the 30 probes already in `scripts/ablate.ts`. No
model calls, so it is instant and free.

**What to look for:** how many junk questions correctly refuse, and whether any
*good* question gets refused. Both matter — a gate that refuses everything scores
perfectly on the first count.

**Why this is code, not a prompt:** policy you can test is worth more than policy
you have to ask a model to follow. This function is deterministic, free, and
runs in microseconds.

---

## Step 5 — Citations

**Goal:** make the answer accountable.

**You write:** the return shape `{ answer, citations: [{ sourceFile, heading, score }] }`.

**What to look for:** whether the model used the chunk it cited. Ask a question
whose answer is only in chunk 4 and see whether it cites chunk 4 or chunk 1.

**Why it matters:** a citation nobody checks is decoration. This is the property
that makes the whole design defensible — a user can open
`rules/ay-2025-26/corpus/rebate.md` and read the rule themselves.

---

## Step 6 — The API route

**Goal:** wire it up. This should feel boring.

**You write:** `app/api/ask/route.ts` — parse the request, call the pipeline,
stream the response.

**Also:** log every request with its scores and whether the model was called.
That log is how you tune the floor with real questions instead of guesses.

**Why last:** all the thinking already happened in steps 1-5. If this step feels
hard, something earlier was skipped.

---

## Step 7 — Measure

**Goal:** the Phase 3 habit, applied to answers.

Retrieval asked *"did we find the right chunk?"* Generation asks *"did the answer
come from the chunk, or did the model invent it?"* Different question, different
metrics.

**Ablations worth running:**

| variable | question |
|---|---|
| 3 vs 5 vs 8 chunks | does more context help, or add noise? |
| temperature 0 vs 0.7 | does lower temperature reduce invention? |
| prompt variants from step 3 | which instruction earns its place? |
| chunking strategy | does `sentence` still lose once answers are judged? |

That last one matters. Phase 3 chose `heading` over `sentence` partly on the
argument that 270 words of context beats 120. **Step 7 is where you find out
whether that argument was right** — you never actually measured it.

---

## Test these five by hand

1. **In scope, year-specific** — "how is the rebate calculated for 2026-27?" → cited answer, right year
2. **Process** — "how do I submit my return?" → answer from `shared/`, no year
3. **Out of scope** — "what is the corporate tax rate?" → refusal, **model never called**
4. **Junk** — "best biryani in Dhaka" → refusal
5. **A calculation** — "how much tax do I owe on 8 lakh?" → redirect to Calculate, **never computed by the model**

Case 5 is the one people get wrong. The model will happily do the arithmetic if
you let it. It must not.

---

## Done when

- [ ] Answers cite at least one source file
- [ ] Out-of-scope questions are refused **without calling the model** (check the log)
- [ ] "How much do I owe" redirects to Calculate rather than computing
- [ ] Year filtering works — the 2026-27 selector never returns 2025-26 rule chunks
- [ ] Streaming works end to end
- [ ] Every request is logged with scores

---

## Where each step's ideas come from

| step | learn doc |
|---|---|
| 1, 2 | [Part 1 — Why search is hard](learn/01-why-search-is-hard.md) — the RAG loop and why the model needs your facts |
| 3, 5 | new ground: prompt design and grounded generation |
| 4 | [Part 6 — Retrieval](learn/06-retrieval.md) — the floor, the spread, the three signals |
| 7 | [Part 7 — Measuring](learn/07-measuring.md) — ablation method, ceiling effects, proxy metrics |

Say **"start step 1"** when FreeLLMAPI answers that `curl`.
