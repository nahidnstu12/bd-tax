# Setup & usage guide

How to install, run, and live with this system on any local machine.
Everything runs on your own hardware — nothing is deployed, nothing is hosted.

---

## 1. What you are running

Four pieces, all local:

| Piece | What it does | Needed from |
|---|---|---|
| **Node + this repo** | calculator, corpus, web UI | Phase 1 |
| **Postgres + pgvector** (Docker) | stores corpus chunks and their vectors | Phase 3 |
| **Ollama** | generates embeddings locally, so private data never leaves | Phase 3 |
| **FreeLLMAPI** | generates prose answers via free-tier providers | Phase 4 |

**Phase 1 needs only Node.** Do not install the rest until you reach Phase 3.

```
        ┌───────────────────────────────────────────┐
        │  your machine                             │
        │                                           │
        │  Next.js ──► lib/calc      (no network)   │
        │      │                                    │
        │      ├────► Ollama :11434  (embeddings)   │
        │      ├────► Postgres :5433 (vectors)      │
        │      └────► FreeLLMAPI :3001 ──► internet │
        │                     (public rule text     │
        │                      + anonymised values) │
        └───────────────────────────────────────────┘
```

---

## 2. Prerequisites

| Tool | Version | Install |
|---|---|---|
| Node.js | 20+ | https://nodejs.org or `nvm install 20` |
| Docker Desktop | any recent | https://docker.com — only from Phase 3 |
| Ollama | any recent | https://ollama.com — only from Phase 3 |
| FreeLLMAPI | any | see §5 — only from Phase 4 |
| poppler *(optional)* | — | `brew install poppler` — only to read PDFs into the corpus |

---

## 3. First run (Phase 1 only — no AI)

```bash
cd bd-tax
npm install

npm run calc -- 2025-26        # built-in sample breakdown
```

Expected: a full breakdown ending with `[UNVERIFIED CONFIG]` warnings. That is correct —
the tax figures have not yet been validated against a filed return.

### Add your filed return

```bash
cp private/returns/2025-26.example.json private/returns/2025-26.json
# edit with your real figures
npm run eval
```

`private/` is gitignored. **This is the only place personal data lives, and it never
leaves the machine.**

---

## 4. Database & embeddings (from Phase 3)

```bash
npm run db:up          # starts Postgres + pgvector on host port 5433
npm run db:schema      # creates the chunks table + HNSW index

ollama pull nomic-embed-text
ollama list            # confirm

npm run index          # embed the corpus into Postgres
npm run search -- "is festival bonus taxable?" 2025-26
```

**Port 5433 is deliberate** — it avoids clashing with the pharmacy-pos database on 5432.

Stop / start / reset:

```bash
docker compose stop
docker compose up -d
docker compose down -v && npm run db:up && npm run db:schema && npm run index   # full reset
```

---

## 5. FreeLLMAPI (from Phase 4)

Runs separately — it is a general-purpose gateway, not part of this repo.

```bash
curl -fsSL https://freellmapi.co/install.sh | bash
```

Open http://localhost:3001, add free provider keys on the **Keys** page, and copy the
unified key from the header.

**Do not use it for embeddings.** Embeddings stay on Ollama, always — see §7.

---

## 6. Environment

`.env.local` in the project root:

```bash
# Database (Phase 3+)
DATABASE_URL=postgres://postgres:secret@localhost:5433/ragdb

# Embeddings — LOCAL ONLY (Phase 3+)
OLLAMA_BASE_URL=http://localhost:11434/v1
EMBED_MODEL=nomic-embed-text

# Generation — hosted (Phase 4+)
FREELLMAPI_BASE_URL=http://localhost:3001/v1
FREELLMAPI_KEY=freellmapi-xxxxx
CHAT_MODEL=auto

# Retrieval
RETRIEVAL_SCORE_FLOOR=0.5
```

**`EMBED_MODEL` is a hard contract with the database.** `nomic-embed-text` produces 768
dimensions and `db/schema.sql` declares `vector(768)`. Changing the model requires a
schema migration **and** a full re-index — see §9.

---

## 7. Privacy rules — the ones that matter

| Data | Where it may go |
|---|---|
| Public tax rules (corpus) | Ollama **and** FreeLLMAPI — fine, it is public |
| Your income figures | **local only** |
| TIN, NID, name, employer, account numbers | **never anywhere** — do not even put them in `private/` fixtures |
| Derived values for narration (total income, tax) | FreeLLMAPI, **without identifiers** |

Free-tier providers may train on inputs. That is why embeddings are local and why the
narration prompt receives a `Breakdown` object — which contains no identifiers by design.

If even income figures feel too exposed, point `CHAT_MODEL` at a local Ollama chat model.
Only `baseURL` changes; no other code moves.

---

## 8. Daily commands

| Command | Does |
|---|---|
| `npm run calc -- <year>` | print a breakdown for the sample or a saved scenario |
| `npm run eval` | replay filed returns (+ retrieval hit rate from Phase 6) |
| `npm run index` | re-embed the corpus — **after every corpus edit** |
| `npm run search -- "<q>" <year>` | raw retrieval scores in the terminal |
| `npm run db:up` / `docker compose stop` | database lifecycle |
| `npm run dev` | Next.js UI (Phase 4+) |

**Rule of thumb: edit corpus → `npm run index`.** Forgetting is the most common
"why didn't my change work" moment.

---

## 9. Troubleshooting

| Symptom | Cause & fix |
|---|---|
| `Embedding failed` | Ollama not running → `ollama serve` |
| `ECONNREFUSED …5433` | `npm run db:up` |
| `type "vector" does not exist` | `npm run db:schema` |
| `expected 768 dimensions, not N` | `EMBED_MODEL` changed — edit `vector(N)` in schema, recreate the table, re-index |
| Search returns nothing | corpus not indexed → `npm run index` |
| Search returns stale content | re-index; `index-corpus.ts` truncates and rebuilds |
| All scores ~0.99 | one giant chunk, or the question was embedded as a document |
| Ask tab refuses everything | floor too high, or corpus missing that topic |
| Ask tab answers out-of-scope questions | raise `RETRIEVAL_SCORE_FLOOR` |
| `No config for assessment year` | no `rules/ay-<year>/` folder |
| Eval says no returns found | fixture still named `*.example.json` |
| Answers slow or failing | check FreeLLMAPI at :3001; a provider may be rate-limited |

---

## 10. Moving to another machine

```bash
git clone <your repo>
npm install
cp .env.local.example .env.local     # then edit
npm run db:up && npm run db:schema
ollama pull nomic-embed-text
npm run index
```

**`private/` is not in git.** Copy it across manually — encrypted USB, password manager,
or an encrypted archive. Never a cloud drive or a chat message.

Losing `private/` means losing your test set, and with it the proof that the calculator
is correct. **Back it up.**

---

## 11. Yearly ritual (~2 hours)

When the Finance Act lands, around June/July:

```bash
cp -r rules/ay-2026-27 rules/ay-2027-28
# edit config.json figures + corpus prose; set "verified": false
npm run index
npm run eval                                  # OLD YEARS MUST STILL PASS
npx tsx scripts/config-diff.ts 2026-27 2027-28
```

**Never edit an old year.** Version by folder. That single rule keeps the replay eval
meaningful and prevents repealed rules from surfacing in current-year answers.

---

## 12. What this system is not

- Not tax advice — guidance only; verify against the official form
- Not a filing tool — it never submits anything to NBR
- Not multi-user, not deployed, no auth — local, single person
- Not authoritative on rates until a config shows `"verified": true`

Actual filing happens at **https://etaxnbr.gov.bd** — the process is documented in
[`research/etax-filing-guide.md`](research/etax-filing-guide.md).
