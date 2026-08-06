# Part 1 — Why search is hard

**The question:** why can't we just search for the words the user typed?

---

## Start with what everyone tries first

A user asks:

> "money I get from renting out my flat"

Your corpus contains the answer. Let's search for it the normal way:

```sql
SELECT * FROM chunks WHERE content LIKE '%flat%';     -- 0 rows
SELECT * FROM chunks WHERE content LIKE '%renting%';  -- 0 rows
```

**Zero results.** But the answer is definitely there — `house-property.md` says:

> "How do I enter **house property income** on e-Return?"

The user said *flat*. Your document says *house property*. The user said
*renting*. Your document says *rental income*.

Same meaning. **Zero shared words.**

This is not a rare edge case. It is what normal people do all the time. Nobody
types the exact phrase your document uses, because they don't know what phrase
your document uses — that's why they're asking.

## The analogy

Imagine a library where you can only find a book if you say its **exact title**.

> "Do you have *A Practical Guide to Residential Property Income Assessment*?"
> "Yes, right here."

> "Do you have anything about renting out my flat?"
> "Never heard of it."

That library is useless, and it is exactly what `LIKE` gives you.

Now imagine a librarian who has read everything. You say "renting out my flat"
and they walk straight to the property shelf — because they understand what you
**mean**, not which letters you typed.

That is what we are building. The whole of Phase 3 is: **how do you build that
librarian out of arithmetic?**

## Why the obvious fixes don't work

You might think of patching keyword search:

| Fix | Why it breaks |
|---|---|
| Add synonyms — flat = apartment = house | You must guess every word every user will ever type, in advance, forever |
| Search for *any* word, not all | "my" and "I" match everything; you drown in noise |
| Stemming — rent, renting, rented | Helps a little. Still zero connection between *flat* and *house property* |
| Just ask the LLM to read all the docs | Costs a fortune, gets slow, and models have limited memory. Fine for 21 files, impossible for 21,000 |

The problem isn't the technique. The problem is that **letters aren't meaning.**
"Flat" and "house property" share no letters and mean the same thing. "Bank" and
"bank" share every letter and mean two different things (money, or a river's
edge).

## The idea that solves it

> Convert every text into a **position in space**, arranged so that texts with
> similar meaning end up close together.

Once text is a position, "find things that mean the same" becomes "find things
that are nearby" — and *nearby* is just arithmetic. Computers are extremely good
at arithmetic.

That's it. That's the whole trick. Part 2 explains how the conversion works.

## Where this fits: what "RAG" means

You'll see the term **RAG** — Retrieval-Augmented Generation. It sounds
technical. It means:

```
Retrieval      find the right paragraphs from your own documents
Augmented      paste them into the prompt
Generation     let the model write an answer using ONLY those paragraphs
```

Why bother? Three reasons, and all three apply to your project:

**1. The model doesn't know your facts.** No language model has read the NBR
e-Return manual for AY 2026-27. Your corpus has. Retrieval puts your facts in
front of it.

**2. You get citations.** Because you know which chunk you handed over, you can
show the user `rules/ay-2025-26/corpus/rebate.md`. A model answering from memory
cannot tell you where it got something — often it can't tell *itself*.

**3. You can update facts without retraining.** New Finance Act? Edit a markdown
file and re-run `npm run index`. Thirty seconds. Retraining a model would take
weeks and a data centre.

## The failure mode to keep in mind

Retrieval hands the model five paragraphs. The model will use them.

If retrieval hands over five paragraphs about **minimum tax** when the user asked
about **corporate tax**, the model doesn't say "these are irrelevant". It writes
a confident, fluent, well-formatted answer about corporate tax that is
**completely invented**.

You saw this exact thing. Before you fixed `out-of-scope.md`:

```
"what is the corporate tax rate?"
1.  0.623   minimum-tax.md      ← above the 0.5 floor, so it WOULD reach the model
2.  0.603   minimum-tax.md
3.  0.589   thresholds.md
```

The model would have answered. It would have sounded right. It would have been
wrong, about tax, for a real person filing a real return.

**Bad retrieval is not a smaller version of good retrieval. It is worse than no
answer at all.** Everything in the rest of these docs is downstream of that fact.

## Common confusions

**"So embeddings replace keyword search?"**
Not always. Keyword search is *better* for exact rare strings — a TIN number, a
section reference like `6th Schedule Part 1`, a product code. Embeddings are
better for meaning. Serious systems use both; see Part 8, "hybrid search".

**"Is RAG the same as fine-tuning?"**
No, and they solve different problems. Fine-tuning changes the model's *style
and behaviour*. RAG changes the model's *facts*. If you want it to speak like a
Bangladeshi tax officer, fine-tune. If you want it to know this year's rebate
cap, retrieve.

**"Does the model search the database?"**
No. In your design the model never touches the database. Code searches, code
picks five rows, code puts them in the prompt. The model only reads. That's a
deliberate safety property — the model cannot go looking for something that
supports the answer it already wants to give.

## Go deeper

- Try it yourself: `SELECT content FROM chunks WHERE content ILIKE '%flat%'` against your own database. Watch it return nothing.
- Look up **BM25** — the algorithm behind classic keyword search (Elasticsearch, Postgres full-text). Understanding what it's good at tells you exactly when embeddings are the wrong tool.
- Read about **the vocabulary mismatch problem** — this is its formal name, and it has been studied since the 1980s. Embeddings are the current best answer, not the first attempt.

---

Next: [Part 2 — Embeddings](02-embeddings.md)
