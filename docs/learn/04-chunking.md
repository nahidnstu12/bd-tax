# Part 4 — Chunking: where you cut decides everything

**The question:** why is deciding where to cut a document the highest-leverage
decision in the whole system?

---

## The analogy: the class photo

You take one photo of 40 students and average all their faces into a single
image. The result looks like nobody. Every individual feature is washed out.

Now take 40 separate photos. Each one clearly shows one person.

**A chunk is a photo. Embedding it averages everything inside into one blurry
face.**

```
ONE CHUNK  =  ONE VECTOR  =  ONE AVERAGE
```

The more ideas you put in a chunk, the blurrier it gets. Not "slightly worse" —
mathematically averaged away.

## Your own proof

Your original salary chunk, ~50 words:

> "Employment income includes basic salary, allowances, **festival bonus**, and
> non-cash benefits you enter under Income from Employment. Multiple employers in
> one year use Add Employment; the portal can show an employment summary. Enter
> annual totals from the employer salary certificate."

Three separate ideas: what counts as salary / multiple employers / which figures
to use. `festival bonus` is **two words out of fifty**.

Result:

```
"is my festival bonus taxable?"
1.  0.589   slabs.md          ← wrong
2.  0.576   slabs.md          ← wrong
3.  0.566   minimum-tax.md    ← wrong
4.  0.566   slabs.md          ← wrong
5.  0.565   salary-income.md  ← the right answer, LAST
```

The word *taxable* pulled toward the slab chunks, which are about nothing else.
The one chunk that literally contained "festival bonus" came fifth.

**No better model fixes this. No better prompt fixes this.** The fact was already
averaged away before the model was ever involved. Only a different cut helps.

## The trade-off

```
TOO BIG                                              TOO SMALL
one file per chunk                          one sentence per chunk
     │                                                    │
specific facts get                          each chunk loses the
averaged away                               context that gave it meaning
     │                                                    │
     └──────────── you are choosing a point ─────────────┘
                        on this line
```

There is no universally correct answer. It depends on your documents and your
questions. Which is why you **measure** rather than guess.

## What you measured

Five strategies, same corpus, same model, same SQL, 30 questions:

| strategy | chunks | avg words | MRR | what it does |
|---|---|---|---|---|
| `heading` | 67 | 54 | **0.918** | cut at `##`, prepend the heading |
| `no-heading` | 67 | 46 | 0.894 | same cuts, no heading prepended |
| `sentence` | 196 | 24 | **0.950** | one sentence per chunk |
| `fixed` | 40 | 92 | 0.796 | 800-character blocks, ignore structure |
| `file` | 21 | 179 | 0.672 | whole file as one chunk |

Three things fall straight out of that table.

### 1. Structure beats character counts

`fixed` and `file` are clearly worst. Here's `fixed` chunk 2 of `salary-income.md`:

```
"year configs. Does exempt salary appear anywhere besides Schedule 1?…"
```

It **starts mid-sentence**. The 800-character boundary landed inside
"…kept only for older year configs." An idea was cut in half, and half of it now
lives at the start of a chunk about something else.

This is what most RAG tutorials ship. Your corpus already marks its own seams
with `##` headings — using them is free and strictly better.

### 2. Prepending the heading helps

`heading` (0.918) beat `no-heading` (0.894). The heading is often the part your
question most resembles:

```
user:    "I changed my mobile number, what should I do?"
heading: "I changed my mobile number — what now?"
```

Almost the same sentence. Throwing the heading away throws that away.

**But be careful how you learned this.** On your *first* 10-probe run,
`no-heading` won 0.900 to 0.820. It reversed on 30 probes. The first test was
saturated — 8 of 10 probes already at rank 1 — so the whole result rested on one
question. Part 7 covers this properly; it's called a ceiling effect and it is how
people convince themselves of false things with real data.

### 3. Smaller chunks won on retrieval — and that's still not enough to switch

`sentence` scored highest, but its entire lead was **two rows** out of thirty,
both from that same over-packed salary section.

And retrieval score isn't the goal. Phase 4 sends the retrieved chunks to the LLM
to write an answer from:

| strategy | context handed to the model |
|---|---|
| `heading` | 5 × 54 words = **270 words** |
| `sentence` | 5 × 24 words = **120 words** |

A 24-word fragment can win the search and still be too thin to answer from.

> **Optimising retrieval score alone is optimising the wrong end of the
> pipeline.** The system's output is an answer, not a ranking.

Correct decision: keep `heading`, and fix the corpus instead.

## The move that actually worked

Both real failures had the same shape — one section carrying several ideas. Both
were fixed the same way: **split the section, don't change the words.**

**`out-of-scope.md`** — one paragraph listing eight exclusions became ten `##`
sections, one exclusion each:

```
BEFORE:  "what is the corporate tax rate?"   ·  ·  ·  ·  ·   (missed under ALL five)
AFTER:   "what is the corporate tax rate?"   1  1  1  1  1   (rank 1 under ALL five)
```

A failure that **no chunking strategy could touch** was fixed by a corpus edit in
ten minutes.

**`salary-income.md`** — one section carrying three ideas became three sections.

This is the deepest lesson in Part 4:

> Some retrieval failures are **chunking** problems. Some are **corpus** problems.
> They look identical from the outside. The way you tell them apart is that a
> corpus problem fails under **every** strategy.

That invariance is the diagnostic. It's why running all five strategies matters.

## The three decisions your chunker makes

`lib/rag/chunk.ts`, default strategy:

**1. Cut at `##` headings.** The corpus was written one idea per heading, so the
seams are already marked. No guessing.

**2. Prepend the heading to the body before embedding.**

```ts
content = `${heading}\n\n${body}`
```

The heading is embedded, not just stored. Measured worth: +0.024 MRR.

**3. Carry `assessment_year` from front-matter down to every chunk.**

```ts
const assessmentYear = data.assessment_year ?? null;
```

`null` means year-independent — filing process, registration. Those must be
retrievable in *every* year. This one line is what stops a repealed 2025-26 slab
appearing in a 2026-27 answer. See Part 6.

## Common confusions

**"Should chunks overlap?"**
A common technique — chunk 2 repeats the last 50 words of chunk 1, so an idea
straddling a boundary survives. It helps when you cut arbitrarily (like `fixed`).
It's largely unnecessary when you cut at real semantic boundaries, as you do.

**"Is there an ideal chunk size?"**
You'll see "512 tokens" quoted a lot. Treat it as a starting point, never an
answer. Your best strategy averages 54 words. Someone else's corpus will differ.
The number that matters is the one your own probes produce.

**"Can I just make chunks small to be safe?"**
No — see the 270 vs 120 words table. You'd be trading answer quality for ranking
quality.

**"What if one section is genuinely huge?"**
Split it in the corpus, as you did. `npm run lint:corpus` warns above 600 words
and below 30 for exactly this reason.

## Go deeper

- Run `npm run chunk:peek` and read your own chunks. If a chunk doesn't read like one complete idea, retrieval will struggle with it.
- Look up **semantic chunking** — splitting where the *embedding* changes sharply, rather than at headings. Useful for documents with no structure (scanned PDFs, transcripts).
- Look up **parent-document retrieval** — search over small chunks for precision, then hand the model the *bigger* surrounding section for context. It's the direct answer to the 270-vs-120-words trade-off, and it's the first thing to try if Phase 4 answers feel thin.
- Look up **contextual retrieval** (Anthropic, 2024) — prepend a model-written sentence of context to each chunk before embedding. A generalisation of what you're already doing by prepending the heading.
- Try adding a `CHUNK_STRATEGY` of your own to `lib/rag/chunk.ts` — for example two sentences per chunk with one sentence of overlap — and run `npm run ablate`. You now have the machinery to test any idea in three minutes.

---

Next: [Part 5 — The vector database](05-vector-database.md)
