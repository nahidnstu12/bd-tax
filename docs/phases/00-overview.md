# Phase 0 — Overview

How the six phases fit together, and why they are in this order.

---

## The shape of the build

```
Phase 1  CALCULATOR          no AI    ← the gate: proves correctness
Phase 2  CORPUS              no AI    ← the data the AI will read
─────────────────────────────────────────────────────────────────
Phase 3  INDEXING            embeddings only
Phase 4  ASK TAB             retrieval + generation
Phase 5  CALCULATE TAB       generation (narration only)
Phase 6  POLISH              year selector, diffs, retrieval eval
Phase 7  PERSONAL ASSISTANT  local filing coach + planning scenarios
```

**Two thirds of the value is built before any AI appears.** That is not a flaw in the
plan — it is what production AI systems actually look like. Tutorials hide this ratio,
which is why people who have done ten RAG tutorials still cannot ship anything.

## Why this order

**Phase 1 first, always.** If the calculator cannot reproduce a return you actually
filed, nothing built on top of it is worth anything. It is pure logic — fully testable,
no model uncertainty — and it settles the unverified rule figures empirically.

**Phase 2 before Phase 3.** Indexing bad content teaches you nothing about retrieval.
Curate first, so that when retrieval is poor you know it is the retrieval, not the data.

**Phase 3 before Phase 4.** Stare at raw similarity scores in a terminal before wrapping
them in a UI. That is where the mental model locks in permanently.

**Phase 5 after Phase 4.** Narration is the easiest AI step — it receives finished
numbers and writes sentences. Do the hard retrieval work first.

## What each phase adds

| Phase | Adds | Depends on |
|---|---|---|
| 1 | `rules/*/config.json`, `lib/calc/`, `eval/replay.ts` | nothing |
| 2 | `rules/*/corpus/*.md` | Phase 1's year folders |
| 3 | Postgres + pgvector, Ollama, `lib/rag/`, `scripts/index-corpus.ts` | Phase 2 |
| 4 | `app/api/ask`, score floor, citations | Phase 3 |
| 5 | `app/` UI, `/api/calculate`, narration | Phases 1 + 4 |
| 6 | year selector, `scripts/config-diff.ts`, `eval/retrieval.ts` | all |
| 7 | local drafts, filing checklist, deterministic planning scenarios | Phase 6 |

## Definition of done, per phase

Each phase doc ends with acceptance criteria. **Treat them as gates, not suggestions.**

| Phase | Done when |
|---|---|
| 1 | `npm run eval` reproduces a filed return to the taka |
| 2 | Every corpus file has valid front-matter and one idea per heading |
| 3 | `npm run search "…"` returns sensible top-5 with scores you believe |
| 4 | Answers cite a file; out-of-scope questions are refused, not guessed |
| 5 | Narration uses only numbers from the breakdown; no invented figures |
| 6 | `npm run eval` reports both replay and retrieval hit rate |

## Rough effort

| Phase | Effort |
|---|---|
| 1 | half a day *(already scaffolded — just needs your return data)* |
| 2 | one afternoon of transcription |
| 3 | one evening |
| 4 | one evening |
| 5 | a weekend |
| 6 | a weekend |
| 7 | a weekend |

## What you will actually learn

- **Phase 3** — what an embedding is, and why chunking is the highest-leverage decision
- **Phase 4** — that RAG is just pasting text into a prompt, and that the guards matter
  more than the model
- **Phase 6** — that measurable retrieval turns tuning into engineering instead of vibes

Phases 1, 2 and 5 teach the unglamorous 80%: data discipline, versioning, and keeping
the model away from anything that must be correct.
