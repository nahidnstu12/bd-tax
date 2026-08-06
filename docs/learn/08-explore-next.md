# Part 8 — Where to go next

You built the simplest thing that works: embed, store, cosine search, filter,
floor. That was the right call — every technique below only makes sense once you
can *measure* whether it helped, and now you can.

This part is a map. Each entry says what the idea is, when you'd need it, and
whether **your** project actually needs it.

---

## Tier 1 — directly useful to this project

### Hybrid search (vector + keyword)

**What:** run cosine search and keyword search (BM25 / Postgres full-text) in
parallel, merge the rankings.

**Why:** they fail in opposite places. Your failing probe *"which savings schemes
reduce my tax?"* misses because the corpus says *investment*, never *savings
scheme* — a vocabulary gap. But *"what is IT-10B?"* or a section reference like
*6th Schedule Part 1* is where keyword search is unbeatable and embeddings get
vague.

**For you:** worth trying. Tax text is full of exact identifiers — form numbers,
schedule references, TIN. Postgres has `tsvector` built in, so it's one more
column and no new dependency.

**Search for:** `reciprocal rank fusion`, `pgvector hybrid search`, `BM25`

### Re-ranking

**What:** retrieve 20 cheaply with vector search, then score those 20 with a
slower, far more accurate **cross-encoder** model, and keep the best 5.

**Why:** a cross-encoder reads the question and the chunk *together*, so it can
tell "this chunk mentions bonus in passing" from "this chunk is about bonus".
Embeddings can't — each side was encoded without knowing the other.

**For you:** this directly targets your festival-bonus problem. Probably the
single highest-value upgrade after Phase 4 works.

**Search for:** `cross-encoder reranker`, `bge-reranker`, `retrieve and rerank`

### Parent-document retrieval

**What:** search over small chunks for precision, but hand the model the *larger*
surrounding section for context.

**Why:** it dissolves the trade-off you hit in Part 4 — `sentence` retrieved
better but gave the model only 120 words. This gives you both: sentence-level
precision, section-level context.

**For you:** the first thing to try if Phase 4 answers feel thin.

**Search for:** `parent document retriever`, `small-to-big retrieval`

### Query expansion

**What:** rewrite the user's question before embedding it. "rebate 2026" becomes
"how is the investment rebate calculated for assessment year 2026-27?"

**Why:** you measured this. Test 10:

```
"investment rebate"                        0.780
"how is the investment rebate calculated?" 0.865    (+0.085)
```

A full sentence beat two keywords by more than the gap between "strong" and "weak"
on your own calibration scale.

**For you:** relevant in Phase 5, when a real search box exists and real users type
two words into it.

**Search for:** `query expansion`, `HyDE hypothetical document embeddings`

---

## Tier 2 — worth understanding, may not need yet

### MMR (Maximal Marginal Relevance)

Picks five results that are relevant **and different from each other**, instead of
five near-duplicates. Your rental probe returned five `house-property.md` chunks —
correct, but somewhat redundant as context.

**Search for:** `maximal marginal relevance`, `diversity in retrieval`

### Contextual retrieval

Prepend a model-written sentence of context to each chunk before embedding
("This chunk is from the 2026-27 rebate rules and explains…"). A generalisation of
what you already do by prepending the heading. Anthropic published strong results
in 2024.

**Search for:** `contextual retrieval anthropic`

### Semantic chunking

Cut where the *embedding* changes sharply rather than at headings. Useful for
documents with no structure — scanned PDFs, transcripts, emails. Your corpus is
well-structured markdown, so you don't need it here. You would for real NBR PDFs.

**Search for:** `semantic chunking`, `text splitter embeddings`

### Metadata filtering at scale

Your year filter is metadata filtering. It's easy at 71 rows and genuinely hard at
millions: the ANN index finds the nearest 5, the filter removes 4, and you get 1.
pgvector's answer is *iterative index scans*.

**Search for:** `filtered ANN search`, `pgvector iterative index scan`

### Multi-vector representations

Store several vectors per chunk — one per sentence, or ColBERT-style one per
token. More accurate, much more storage.

**Search for:** `ColBERT`, `late interaction retrieval`

---

## Tier 3 — the surrounding landscape

### Choosing an embedding model

`nomic-embed-text` was a reasonable default, not a researched choice. Things that
would make you change it:

- **Multilingual** — most models are English-first. If you want questions typed in Bangla to work, this is the setting that decides it. Try it in `sim:lab` and watch the score drop; that's a real limit of your current setup.
- **Dimensions** — 768 vs 1536 vs 3072. More isn't automatically better.
- **Max input length** — text past the limit is silently truncated. A subtle bug.
- **Asymmetric models** — some encode questions and documents differently, with separate prefixes like `query:` and `passage:`. Using the wrong prefix quietly costs accuracy.

**Search for:** `MTEB leaderboard`, `asymmetric embedding models`

### How the vector index really works

- **HNSW internals** — layers, `ef_construction`, `ef_search` (the recall/speed knob)
- **IVFFlat** — the alternative: cluster, then search nearby clusters
- **Quantization** — binary or scalar, storing vectors in a fraction of the space

**Search for:** `HNSW algorithm explained`, `vector quantization`

### Evaluating generation, not just retrieval

Phase 3 asked "did we find the right chunk?" Phase 4 asks "did the answer actually
come from the chunk, or did the model invent it?" Different question, different
metrics: **faithfulness**, **groundedness**, **answer relevance**.

**Search for:** `RAGAS`, `faithfulness metric RAG`, `LLM as judge`

### Prompt design for grounded answers

How you paste chunks into a prompt changes hallucination rates a lot: instructing
the model to cite, to refuse when unsupported, to quote before concluding. This is
Phase 4's real work.

**Search for:** `grounded generation prompt`, `citation prompting`

### Agentic and graph retrieval

- **Agentic RAG** — the model decides what to search for, possibly several times
- **GraphRAG** — build an entity graph, traverse relationships

Both are powerful and both **conflict with your project's core rule**: the AI is
only the voice, it doesn't decide. Worth knowing they exist; worth knowing why you
deliberately aren't using them.

**Search for:** `agentic RAG`, `GraphRAG`

---

## If you only do three things

1. **Re-ranking** — biggest accuracy gain per hour spent
2. **Hybrid search** — your corpus is full of exact identifiers embeddings blur
3. **Grow `eval/questions.json` to 50+ probes** — none of the above means anything
   without a test set honest enough to detect a regression

## The habit worth keeping

Every idea above sounds good in a blog post. Most will do nothing for your corpus.

You now have `npm run ablate`, a 30-probe test set, and a calibrated score scale.
That machinery is worth more than any single technique, because it turns *"this
sounds promising"* into *"this moved MRR from 0.918 to 0.951, and broke nothing."*

**Add one thing at a time. Measure. Keep it only if the number moves.**

That habit is the actual outcome of Phase 3 — more than the code.

---

Back to the [index](00-index.md)
