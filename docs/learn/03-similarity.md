# Part 3 — Similarity: measuring "these mean the same thing"

**The question:** you have two lists of 768 numbers. How do you turn that into
one score meaning "how close?"

---

## The analogy: pointing, not standing

Two people stand in a field. Both point at the same star.

One is standing next to you. One is a kilometre away.

**They are pointing in the same direction.** How far apart they're standing tells
you nothing about whether they agree.

That's the core idea. For text:

> **Direction is meaning. Length is noise.**

A one-sentence chunk and a three-paragraph chunk about the same topic point the
same way. The long one is just... longer. We want to ignore that.

## Why not simple distance?

The obvious way to compare two positions is straight-line distance — how you'd
measure on a map. It's called **Euclidean** or **L2** distance.

It fails badly for text, for one reason: **longer text produces "longer"
vectors**, so a long document looks far away from a short question purely because
of length. The question "is bonus taxable?" is 5 words. Your chunk is 50 words.
Euclidean distance punishes that gap even when the meaning is identical.

Your two runs make the problem concrete. Your chunks vary from 15 to 176 words.
Your questions are all 4-10 words. If length affected the score, every short
chunk would win everything.

## Cosine similarity — the formula

```
                a · b
cos(a, b) = ─────────────
             |a| × |b|
```

Three pieces:

| piece | what it is | plain words |
|---|---|---|
| `a · b` | dot product | multiply matching numbers, add up the results |
| `\|a\|` | magnitude | how "long" the arrow is |
| dividing | normalising | cancels out length, leaves only direction |

The top measures **agreement**. The bottom **removes the effect of size**.

## Worked by hand, in 2D

Forget 768 for a moment. Two dimensions, small numbers.

```
a = [3, 4]        b = [6, 8]        c = [-4, 3]
```

**Dot product** — multiply matching positions, add:

```
a · b = (3 × 6) + (4 × 8) = 18 + 32 = 50
a · c = (3 × -4) + (4 × 3) = -12 + 12 = 0
```

**Magnitude** — Pythagoras:

```
|a| = √(3² + 4²) = √25 = 5
|b| = √(6² + 8²) = √100 = 10
|c| = √((-4)² + 3²) = √25 = 5
```

**Cosine:**

```
cos(a, b) = 50 / (5 × 10) = 50 / 50 = 1.00     ← identical direction
cos(a, c) =  0 / (5 ×  5) =  0 / 25 = 0.00     ← perpendicular, unrelated
```

Notice: `b` is exactly twice `a`. Twice as "long", same direction. Score **1.00**
— length was fully cancelled out. That is the entire point.

## Reading the scale

| score | meaning |
|---|---|
| **1.0** | identical direction — same meaning |
| **0.7** | strongly related |
| **0.4** | vaguely related |
| **0.0** | unrelated |
| **negative** | opposite — rare in practice for text |

But **absolute numbers lie.** They depend on the model and the corpus. What
matters is the scale *within your own system*, which you measured:

| your score | what it turned out to mean | seen in |
|---|---|---|
| 0.865 | ceiling — near-exact match | "how is the investment rebate calculated?" |
| 0.75–0.78 | strong and correct | most passing probes |
| 0.60–0.65 | weak — could be right, could be noise | festival bonus, corporate tax |
| 0.38–0.39 | nothing related exists | biryani |

**Never copy a threshold from a blog post.** Measure your own. Your floor of 0.5
is only meaningful because you know 0.865 is your ceiling and 0.39 is your floor.

## The trap you actually hit

Two of your results:

```
"money I get from renting out my flat"     0.613   ← CORRECT answer
"what is the corporate tax rate?"          0.623   ← COMPLETELY WRONG answer
```

The wrong one scored **higher**.

This is the most important practical lesson about similarity scores:

> **A cosine score tells you how close the nearest thing is. It does not tell
> you whether the nearest thing is any good.**

If the right answer isn't in your corpus, the score just tells you how close the
nearest *wrong* thing happened to be. That is why Part 6 uses more than the score
to decide whether to answer.

## Distance vs similarity

pgvector works in **distance**, not similarity:

```
cosine distance = 1 - cosine similarity
```

| similarity | distance | |
|---|---|---|
| 1.0 | 0.0 | identical |
| 0.6 | 0.4 | related |
| 0.0 | 1.0 | unrelated |

Same information, flipped. Postgres sorts **ascending**, and nearest should come
first, so distance is the natural unit for the database. Humans prefer similarity
because "0.71 similar" reads better than "0.29 apart" — so `search.ts` converts
at the last moment:

```sql
1 - (embedding <=> $1::vector) AS score
```

## The alternatives, and when they win

**Dot product alone** (no dividing). Faster — skip the square roots. Correct
*only* if all your vectors are already length 1 ("normalised"). `nomic-embed-text`
is **not** normalised — you saw magnitudes well away from 1.0 in `sim:lab`. So
you need the full formula. Some models (OpenAI's) do normalise, and there dot
product and cosine give identical answers.

**Euclidean / L2.** Good for genuine coordinates — GPS points, image features,
sensor readings. Wrong for text, for the length reason above.

**BM25 / keyword matching.** The opposite tool. Superb at exact rare strings —
`IT-10B`, a TIN, `6th Schedule Part 1`. Scores zero on paraphrase. Notice your
failing probe *"which savings schemes reduce my tax?"* — the corpus says
*investment*, never *savings scheme*. BM25 would fail this too. But a probe like
*"what is DPS?"* is exactly BM25's strength.

**Hybrid.** Run both, merge the rankings. This is what most production systems
do, because the two methods fail in different places. See Part 8.

## In your project

`lib/rag/similarity.ts` implements the formula by hand — one loop, no library:

```ts
for (let i = 0; i < a.length; i++) {
  dot    += a[i] * b[i];
  sumSqA += a[i] * a[i];
  sumSqB += b[i] * b[i];
}
return dot / (Math.sqrt(sumSqA) * Math.sqrt(sumSqB));
```

That function is **not used in production** — Postgres does this with `<=>`. It
exists so you can see there is no magic. The `<=>` operator runs this same
arithmetic in C.

The free self-test: comparing any text with itself must give exactly `1.00`. If
your diagonal in `sim:lab` isn't 1.00, the formula is wrong.

## Common confusions

**"Higher score = better answer?"**
No. Higher = *nearer*. Your corporate tax miss at 0.623 beat your rental hit at
0.613. Nearest is not the same as correct.

**"Can cosine be negative?"**
Mathematically yes, down to -1. In practice modern text embeddings rarely go
below 0 — the space just isn't used that way.

**"Why does the biryani question still score 0.39 and not 0?"**
Both texts are in English, both are questions, both are ordinary prose. They
share a lot of general "text-ness". 0.39 is the floor of your corpus, not zero.

## Go deeper

- Re-run `npm run sim:lab` and add sentence pairs of your own. Try a Bangla transliteration and watch the score drop — that tells you something real about the model.
- Look up **normalised embeddings** and check whether your next model returns them. It changes which operator you should use (`<=>` vs `<#>`).
- Read about **anisotropy in embedding spaces** — the reason unrelated text scores 0.39 instead of 0.0, and why some systems subtract the average vector before comparing.
- Compare pgvector's three operators: `<->` (L2), `<#>` (inner product), `<=>` (cosine). Your schema commits to cosine via `vector_cosine_ops`; know why before you change it.

---

Next: [Part 4 — Chunking](04-chunking.md)
