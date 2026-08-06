# Part 2 — Embeddings: turning meaning into numbers

**The question:** how does a computer turn "is my festival bonus taxable?" into
something it can compare?

---

## The analogy: an address for meaning

Think about a map of a city.

Every building has coordinates — two numbers, like `23.81, 90.41`. If two
buildings have close coordinates, they are physically near each other. You don't
need to look at the buildings to know that. **The numbers alone tell you.**

Now imagine a city where buildings are arranged **by what they're about**, not
by where they were built:

- All the tax-rate buildings on one street
- All the rental-income buildings a few streets over
- All the how-to-file-a-form buildings in another district
- Biryani restaurants on the far side of town

If you know a building's coordinates, you know roughly what it's about.

An **embedding** is exactly this — coordinates for a piece of text. The only
difference is that instead of 2 numbers, it uses **768**.

## Why 768 numbers instead of 2?

Two numbers can only capture two things about meaning. Real meaning has far more
dimensions than that: formal or casual, past or future, question or statement,
money-related, legal, technical, emotional…

You can picture a few of the dimensions like this (made up, for intuition):

```
                    "is my festival bonus taxable?"
dimension 1   about money?          0.9
dimension 2   about employment?     0.8
dimension 3   a question?           0.9
dimension 4   about food?          -0.7
dimension 5   about law?            0.6
...
dimension 768 ...                   0.02
```

Real embeddings are **not** labelled like this. Nobody decided what dimension 1
means. The model learned all 768 dimensions on its own from reading enormous
amounts of text, and no human can say what most of them represent.

That's fine. **You never need to know what a dimension means.** You only ever
compare whole positions.

## What you actually saw

When you ran `npm run embed:peek`, you got something like this:

```
text:    is my festival bonus taxable?
model:   nomic-embed-text
length:  768
first 8: [ 0.031, -0.017, 0.044, 0.008, -0.052, 0.019, 0.036, -0.011 ]
```

That's it. That is what "the computer understands your sentence" looks like from
the outside — 768 small numbers, mostly between -1 and 1, individually
meaningless.

## The critical property

Here is the thing that makes this work, and it's worth reading twice:

> **The model was trained so that texts with similar meaning get similar numbers
> — even when they share no words at all.**

Your own run proved it:

```
"money I get from renting out my flat"
1.  0.613   How do I enter house property income on e-Return?
```

Not one word in common. Still the top hit. **The words were never compared.
Only the positions were.**

## How the model does this (the honest short version)

The model reads your sentence, one piece at a time, and builds up a
representation of it. It was trained on hundreds of millions of text pairs, with
one goal:

> If two texts mean the same thing, push their coordinates together.
> If they mean different things, push them apart.

Repeat billions of times and the space organises itself. Questions end up near
their answers. Synonyms end up on top of each other. Unrelated topics drift to
opposite sides.

Nobody wrote a rule saying "flat is similar to house property". It emerged from
the training data, because in real text those words appear in the same kinds of
sentences.

## In your project

`lib/rag/embed.ts` — the whole thing is one call:

```ts
const res = await embedder.embeddings.create({ model: MODEL, input: text });
return res.data[0].embedding;    // number[] of length 768
```

Three details in that file worth understanding:

**1. It runs locally.** `OLLAMA_BASE_URL` points at `localhost:11434`. Your text
never leaves your machine. For a tax assistant that will one day see someone's
real salary, this is not a nice-to-have. Embeddings stay local; only public rule
text ever goes to a hosted model.

**2. The dimension check is a hard contract.**

```ts
if (vec.length !== DIMENSIONS) throw new Error(...)
```

`db/schema.sql` declares `embedding vector(768)`. If you switched to a model
producing 1024 numbers, every insert would fail. This check turns a confusing
database error into a clear message. **Changing the embedding model means a
schema migration and a full re-index — never a quiet swap.**

**3. Question and document use the SAME model.** This is not optional. Two models
build two different cities. Comparing coordinates across them gives numbers that
look perfectly reasonable and mean absolutely nothing.

## Common confusions

**"Does the embedding contain my text?"**
No. It's one-way in practice. You cannot read the sentence back out of the 768
numbers. That's why the `chunks` table stores `content` as text *and* `embedding`
as a vector — you need the text to show the user, and the vector to search.

**"Is a bigger embedding better?"**
Not automatically. 768 vs 1536 dimensions is a trade: more dimensions can capture
more nuance, but cost more storage, more memory, and more time per comparison.
For 71 chunks it makes no measurable difference to you.

**"Does word order matter?"**
Yes. "dog bites man" and "man bites dog" get different embeddings. This is why
modern embeddings beat the old "bag of words" methods.

**"Why did my first embed take 1097ms and the rest 111ms?"**
Cold start. Ollama loads the model into memory on the first call. You saw exactly
this in your search runs.

## Go deeper

- Run `npm run embed:peek "your own sentence"` and change one word at a time. Watch which numbers move.
- Run `npm run sim:lab` again and look at the **magnitudes** — `nomic-embed-text` does not return unit vectors, which is why Part 3's formula divides by length.
- Look up the **MTEB leaderboard** — a public ranking of embedding models. It shows there is no single "best"; models differ by language, by task, and by document length.
- Search for **"embedding models multilingual"** — most are English-first. If you ever want questions typed in Bangla to work, this is the setting you'd change, and it's a real limitation of your current setup.
- Learn what a **token** is. Every embedding model has a maximum input length (`nomic-embed-text` is ~8192 tokens). Text past the limit is silently cut off — a subtle bug if you ever embed something long.

---

Next: [Part 3 — Similarity](03-similarity.md)
