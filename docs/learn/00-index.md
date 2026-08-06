# Learning Phase 3 — how search over your own documents actually works

You built this already. This is the "why", written so the ideas stay with you
after the code is finished.

Every example uses **real numbers from your own runs** — not textbook numbers.
When you see `0.865` or `rank 5` or `71 chunks`, that came out of your terminal.

## The parts

| # | Part | The question it answers |
|---|---|---|
| 1 | [Why search is hard](01-why-search-is-hard.md) | Why can't we just use `LIKE '%bonus%'`? |
| 2 | [Embeddings](02-embeddings.md) | How does a computer turn meaning into numbers? |
| 3 | [Similarity](03-similarity.md) | How do you measure "these two texts mean the same thing"? |
| 4 | [Chunking](04-chunking.md) | Where do you cut the document, and why does it matter so much? |
| 5 | [The vector database](05-vector-database.md) | What is pgvector doing, and what is an HNSW index? |
| 6 | [Retrieval](06-retrieval.md) | How do five rows get chosen, and when should we refuse to answer? |
| 7 | [Measuring](07-measuring.md) | How do you know if a change helped, instead of guessing? |
| 8 | [Where to go next](08-explore-next.md) | What exists beyond what we built? |

Read in order the first time. Parts 4 and 7 are the ones that will change how
you build things.

## The one-paragraph version

A computer cannot read. So we convert every piece of text into a list of 768
numbers — a **position in space** — where texts that mean similar things land
near each other. A user's question gets converted the same way. Then "find the
answer" becomes "find the nearest points", which is just arithmetic. The
database sorts by distance and hands back the closest five. **Nothing in that
process understands tax.** It only understands "near" and "far".

## The rule that makes this project different

> **It is a calculator with a librarian attached. The AI is only the voice.**

- The **calculator** computes tax. Plain code, no AI, exact taka amounts.
- The **librarian** finds the right paragraph. That is Phase 3 — this course.
- The **voice** puts it in a sentence. That is the LLM, and it arrives in Phase 4.

The librarian never decides anything. It fetches. If it fetches the wrong page,
the voice will read the wrong page out loud very confidently. **That is why
retrieval quality is the whole game.**

## How to use these docs

Each part has the same shape:

- **The question** — what you'll be able to answer at the end
- **An analogy** — the intuition, in everyday terms
- **The real thing** — what actually happens
- **In your project** — real code and real numbers from your runs
- **Common confusions** — mistakes that are easy to make
- **Go deeper** — where to look if this part interests you

You do not need maths beyond multiplication and addition. Where a formula
appears, it is worked out with small numbers first.
