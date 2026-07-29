# BD Tax Assistant

Personal tax-filing assistant for Bangladesh individual taxpayers. Local only.
Built as a production-shaped learning project for RAG / AI engineering.

**Design docs:** [`docs/planning-and-architecture.md`](docs/planning-and-architecture.md)

---

## The rule this project is built on

**It is a calculator with a librarian attached. The AI is only the voice.**

- **Facts** — rules-as-data, versioned per assessment year, transcribed by hand
- **Math** — deterministic code; every taka originates here
- **Language** — the LLM explains and retrieves; it never decides, never computes

`lib/calc/` has **zero dependency on the AI layer.** Remove the model entirely and
tax computation still works. That is the test of whether the layering is right.

---

## Status

| Phase | | |
|---|---|---|
| 1 | Calculator + replay eval | **scaffolded — awaiting real return data** |
| 2 | Curate rules corpus | not started |
| 3 | Index → pgvector → search | not started |
| 4 | Ask tab (RAG + citations) | not started |
| 5 | Calculate tab + narration | not started |
| 6 | Year selector, config diff | not started |

**All rule figures are currently UNVERIFIED** (`"verified": false` in each config).
They came from commentary blogs, not the Finance Act — see
[`docs/research/sources-2026-07-29.md`](docs/research/sources-2026-07-29.md).

---

## Quick start

```bash
npm install

# Print a full breakdown for the built-in sample
npm run calc                 # latest year with a config
npm run calc -- 2025-26      # a specific year

# Replay your filed returns (see below)
npm run eval
```

### The replay eval

The spine of the project, and the reason it can be trusted:

1. `cp private/returns/2025-26.example.json private/returns/2025-26.json`
2. Fill in your real figures and the tax you actually filed
3. `npm run eval`

**Pass** → the config figures reproduce a real filed return, so they are almost
certainly correct. That is empirical verification without needing the Act.
**Fail** → the eval prints the full working so the gap is findable, and the
`_verify` list in each config names the likely culprits.

`private/` is gitignored. Personal tax data is never committed, never embedded,
and never sent to a hosted model.

---

## Layout

```
rules/ay-<year>/config.json   rule figures — data, not code. Old years are NEVER edited.
lib/calc/                     the calculator (no AI)
eval/replay.ts                replay your filed returns
eval/calc-cli.ts              ad-hoc breakdown printer
private/returns/              your filed returns — gitignored
docs/                         planning, architecture, research
db/schema.sql                 pgvector corpus table (Phase 3)
docker-compose.yml            Postgres 17 + pgvector on port 5433
```

### Adding an assessment year

Copy the newest `rules/ay-*/` folder, edit the changed figures, re-run `npm run eval`.
**Previous years must still pass** — that is why old configs are never mutated.
Diffing two `config.json` files gives you a free "what changed this year" summary.

---

## Scope (v1)

**In:** resident individual · salaried · house property · bank interest ·
investment rebate · minimum tax

**Out:** business/professional income · capital gains · foreign income ·
agricultural income · non-resident · surcharge on net worth · company tax ·
actual e-return submission

Out-of-scope inputs should make the app **say so and stop**, not guess.
That refusal is a feature.

---

## Stack (later phases)

Next.js · Postgres + pgvector · Ollama (`nomic-embed-text`) for embeddings ·
FreeLLMAPI for generation.

Embeddings run **locally** so personal figures never leave the machine.
Only public rule text and anonymised derived values reach the hosted model.
