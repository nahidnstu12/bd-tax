# Part 7 — Measuring: how to know instead of guess

**The question:** you changed something. Did it help?

---

## Why this part matters most

Everything in RAG *feels* like it's working. You type a question, five plausible
results appear, and you nod. Then you change the chunker, type another question,
five plausible results appear, and you nod again.

You have learned nothing. You cannot tell:

- Did the change help or hurt?
- Did it fix one question while breaking three others?
- Is your "improvement" real, or did you just try an easier question?

**Retrieval quality is invisible without measurement.** This part is the
difference between building a system and hoping about one.

## The analogy: the eye doctor

The optician doesn't ask "does this feel better?" They show you the same letters
through lens A, then lens B, and ask which is sharper.

Same chart. Same lighting. Same distance. **One variable changes.**

That's an ablation. `npm run ablate` is your eye chart.

## What "ablation" means

Remove or change **one** component, hold everything else fixed, see what the
number does.

Your run:

| held fixed | changed |
|---|---|
| the corpus | where the text is cut |
| the embedding model | |
| the SQL | |
| the 30 questions | |
| the same session | |

Because only the cut varied, any difference in the numbers **is** the cut. That's
the entire logic.

## Building a test set

```ts
{ q: 'is my festival bonus taxable?', expect: ['salary-income.md'] }
```

A question, and the file that should answer it. Three design decisions in that
one line:

### 1. Expect a FILE, not a chunk id

Under `heading` the answer is chunk #12. Under `sentence` it's chunk #37. Chunk
ids change with every strategy, so scoring on them would make the strategies
incomparable. The **file** is stable across all five.

### 2. Include questions that should fail

```ts
{ q: 'best biryani restaurant in Dhaka', expect: null }
```

Scoring inverts: success means nothing clears the floor. Without this, a strategy
could score well by making everything match everything. **A test suite with no
negative cases can be passed by a system that always says yes.**

### 3. Write the questions the way users type them

Not "salary income exemption one-third rule" — that's how *your document* is
written. Real users type "how much of my salary is exempt from tax?"

## The metrics

### hit@k

How many probes got the right file at rank 1 (`hit@1`), or anywhere in the top 5
(`hit@5`).

Easy to read. Coarse — it cannot tell rank 2 from rank 5.

### MRR — mean reciprocal rank

`1/rank`, averaged over all probes:

| rank | 1 | 2 | 3 | 4 | 5 | miss |
|---|---|---|---|---|---|---|
| score | 1.00 | 0.50 | 0.33 | 0.25 | 0.20 | 0 |

Worked: ranks `[1, 1, 2, 1, 5]` → `(1 + 1 + 0.5 + 1 + 0.2) / 5` = **0.74**

**Why reciprocal?** Because moving an answer from rank 3 to rank 1 matters a lot
(+0.67) and moving it from rank 4 to rank 5 barely matters (-0.05). That matches
reality: users look at the top result.

Like Google — you care whether it's the first result, not whether it's 47th or
53rd.

### Always read the matrix too

```
Best MRR: sentence (0.950)   baseline heading: 0.918
```

An average hides things. `no-heading` scored a respectable 0.894 while **breaking**
a probe entirely:

```
my TDS is not showing on the portal      heading: 1     no-heading: ·
```

A strategy can lift the average and destroy the one question you care about most.
The rank matrix prints **before** the summary in `ablate.ts` for exactly this
reason.

## The mistake you actually made — and it's the valuable one

### Run 1 — ten probes

```
heading      0.820
no-heading   0.900   ← winner
```

Clear result. Confident conclusion. **Wrong.**

### Run 2 — thirty probes

```
heading      0.918   ← winner
no-heading   0.894
```

It reversed.

### Why

In run 1, **8 of 10 probes were already at rank 1**. There was nowhere to
improve. So the whole result rested on a single question — festival bonus, 5 → 1
— which is 0.08 of MRR from one observation.

This is a **ceiling effect**: your test was too easy to detect anything.

The analogy: testing sprinters with a 5-metre dash. Everyone ties. The one person
who trips looks like the whole story.

### What to take from it

> A test where the baseline already scores 8/10 cannot teach you anything.
> Adding more *easy* questions doesn't help — it just moves the ceiling.

The fix was writing 20 **hard** probes: heavy paraphrase, rare terms
(DPS, TDS), facts buried inside long chunks, scope boundaries. Scores dropped from
0.82 to 0.79-0.95 across strategies. **That drop is the test getting more honest,
not the system getting worse.**

This is how people convince themselves of false things using real data. You caught
it because you re-tested rather than shipping the first result.

## Reading a result you can trust

Three checks before believing any number:

**1. Is the margin bigger than one question?**
`sentence` beat `heading` 0.950 to 0.918 — and the entire gap was two rows out of
thirty. Both from the same over-packed salary section. That's a specific fixable
bug, not a general truth about chunkers.

**2. Are there regressions?**
`no-heading` won on average and broke a probe. Weak dominance — never worse on
any row — is a far stronger signal than a better average.

**3. Does the result hold under every variation?**
This is the best diagnostic you have. When *all five* strategies failed the same
probe:

```
what is the corporate tax rate?    ·  ·  ·  ·  ·
which savings schemes reduce my tax?   ·  ·  ·  ·  ·
```

That invariance means the problem is **not** the chunker. It's the corpus. You'd
never have learned that from one strategy.

## Optimise the right end of the pipeline

`sentence` won on MRR. You kept `heading` anyway, and that was correct.

Retrieval score is not the product. The **answer** is. Phase 4 pastes the
retrieved chunks into a prompt:

| strategy | context to the model |
|---|---|
| `heading` | 5 × 54 words = **270 words** |
| `sentence` | 5 × 24 words = **120 words** |

A 24-word fragment can win the ranking and still be too thin to answer from.

> A metric is a proxy. When you optimise hard against a proxy, you drift away
> from the thing it was standing in for.

Knowing when to overrule your own metric is a judgement call. Having the number in
front of you is what makes it a judgement instead of a guess.

## From ablation to regression test

`PROBES` in `ablate.ts` is `eval/questions.json` from Phase 6, with the filenames
still hard-coded in TypeScript.

Same machinery, different question:

| now | Phase 6 |
|---|---|
| "which chunker is best?" | "did my last change break retrieval?" |
| run 2-3 times ever | run on every change |

That's the real destination. Right now you can answer "is this better?" Soon
you'll answer "is this still working?" — which is the question that matters for
the rest of the project's life.

## Common confusions

**"How many test questions do I need?"**
More than you think. Thirty caught what ten missed. Aim for coverage of every
topic and every failure mode, not a round number.

**"Isn't writing the expected answers cheating?"**
Only if you write questions to match your corpus wording. Write the question a
user would ask *first*, then find which file should answer it. If none does,
you've found a corpus gap — like *"which savings schemes reduce my tax?"*, where
your corpus only ever says *investment*.

**"Should I just fix the corpus until every probe passes?"**
Careful. Fixing a real gap is good. Pasting the probe's exact wording into a
heading is tuning the corpus to the test. The probe then passes and real users
still fail.

**"My scores went down after a change. Bad?"**
Not necessarily — check whether the *test* changed. Yours dropped because the
probes got harder. Only compare numbers from the same test set.

## Go deeper

- Add 10 probes of your own from questions you'd genuinely ask, and re-run. See whether your conclusions survive.
- Look up **precision, recall and NDCG** — the standard information-retrieval metrics. NDCG handles "some results are more relevant than others", which hit@k cannot.
- Look up **RAGAS** and **faithfulness / groundedness** metrics — how you'll measure Phase 4, where the question becomes "did the answer actually come from the retrieved chunks?"
- Read about **Goodhart's law**: "when a measure becomes a target, it ceases to be a good measure." That's the 270-vs-120-words trade in one sentence.
- Look up **golden datasets** — how teams build, version, and grow test sets over time. Your `eval/questions.json` is one.

---

Next: [Part 8 — Where to go next](08-explore-next.md)
