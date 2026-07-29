# Documentation index

Start here.

## Understand the system

| Doc | What it covers |
|---|---|
| [`planning-and-architecture.md`](planning-and-architecture.md) | The mental model, scope, data model, architecture, privacy, risks |
| [`setup-guide.md`](setup-guide.md) | **Install and run it anywhere** — prerequisites, env, first run, yearly ritual, troubleshooting |

## Build it, phase by phase

Each phase is independently shippable and has its own acceptance criteria.
**Do not start a phase until the previous one passes.**

| # | Doc | Goal | AI? |
|---|---|---|---|
| 0 | [`phases/00-overview.md`](phases/00-overview.md) | How the phases fit together | — |
| 1 | [`phases/01-calculator.md`](phases/01-calculator.md) | Calculator + replay eval — **the gate** | none |
| 2 | [`phases/02-corpus.md`](phases/02-corpus.md) | Curated rules corpus, tagged by year | none |
| 3 | [`phases/03-indexing.md`](phases/03-indexing.md) | Chunk → embed → pgvector → search | embeddings |
| 4 | [`phases/04-ask-tab.md`](phases/04-ask-tab.md) | Ask API: retrieval, score floor, citations | yes |
| 5 | [`phases/05-calculate-tab.md`](phases/05-calculate-tab.md) | UI + LLM narration of the breakdown | yes |
| 6 | [`phases/06-polish.md`](phases/06-polish.md) | Year selector, config diff, retrieval eval | — |

## Research (raw input, not source of truth)

| Doc | What it is |
|---|---|
| [`research/sources-2026-07-29.md`](research/sources-2026-07-29.md) | Tax figures for AY 2025-26 and 2026-27 from commentary blogs — **unverified**, with the open-questions list |
| [`research/etax-filing-guide.md`](research/etax-filing-guide.md) | The official NBR e-Return filing process, from the NBR user manual |

**Provenance rule:** every figure that reaches `rules/*/config.json` cites an Act and
section — never a blog. Blog commentary may inform corpus *prose*, never *numbers*.

## The one rule behind everything

**It is a calculator with a librarian attached. The AI is only the voice.**

Every number traces to a config value or a user input. Nothing is model-generated.
If you cannot point at where a figure came from, it is a bug.
