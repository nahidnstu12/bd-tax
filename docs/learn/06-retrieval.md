# Part 6 — Retrieval: choosing five rows, and knowing when to refuse

**The question:** how do five chunks get chosen, and how do you stop the system
answering when it shouldn't?

---

## The whole librarian, in one function

```ts
export async function search(query, { year, limit = 5 }) {
  const vector = toVector(await embed(query));

  const { rows } = await pool.query(`
    SELECT id, source_file, heading, content, assessment_year,
           1 - (embedding <=> $1::vector) AS score
      FROM chunks
     WHERE $2::text IS NULL
        OR assessment_year IS NULL
        OR assessment_year = $2::text
     ORDER BY embedding <=> $1::vector
     LIMIT $3
  `, [vector, year ?? null, limit]);

  return rows.map(...);
}
```

Embed the question. One SQL query. Return five rows.

Notice what is **not** here: no model call, no reasoning, no decision. Retrieval
picks rows by geometry alone.

> The LLM does not get to choose its own sources. It gets these five and nothing
> else.

That's a deliberate safety property. A model that could search would go looking
for evidence supporting whatever it already started saying.

## The year filter — an exact job for an exact tool

```sql
WHERE $2::text IS NULL              -- no year requested: return everything
   OR assessment_year IS NULL       -- shared content: always allowed
   OR assessment_year = $2::text    -- this year's content
```

Three branches, and the middle one is the interesting one.

### Why shared content has no year

| content | year | why |
|---|---|---|
| tax slab rates | `2025-26` | changes every Finance Act |
| how to register on the portal | `NULL` | same process regardless of year |
| the rebate cap | `2026-27` | changes |
| how to pay online | `NULL` | same |

Filing process doesn't change with the assessment year, so it carries no year and
must survive **every** filter. Remove the `assessment_year IS NULL` branch and
every "how do I…" question starts returning rate tables.

Your test 3 exists to catch exactly that:

```
"how do I submit my return?"
1.  0.752   filing-process.md   ·  shared    ← must say "shared"
```

### Why a filter and not just similarity

You measured what happens without one:

```
"what are the tax slabs?"   (no --year)
1.  0.783   thresholds.md  2025-26     ← last year wins
2.  0.741   slabs.md       2026-27
```

**Year-blind search preferred the old year** — not because 2025-26 is more
correct, but because of how that file happens to be worded. A year-blind app would
quote last year's rates by default and look perfectly healthy doing it.

The user's question contains no information about which year they mean. Cosine
similarity cannot invent it. **Only the filter can.**

The general principle:

> Exact facts (year, language, document type, access permission) belong in
> `WHERE`. Fuzzy meaning belongs in the similarity score. Never ask a fuzzy tool
> to do an exact job.

Phase 4 must always pass a year. There is no safe default.

## Why five?

Not a magic number. A budget:

- **Too few** — the right chunk was rank 4 and you cut at 3
- **Too many** — you fill the model's context with weak matches, and the wrong
  ones start competing with the right one

Five is a common starting point. Once Phase 4 exists you'll be able to test
whether 3 or 8 gives better *answers* — the number should be tuned against answer
quality, not ranking.

## Knowing when to refuse

Here is the fact everything in this section rests on:

> `ORDER BY distance LIMIT 5` **always** returns five rows if five rows exist.
> The database has no concept of "nothing relevant here."

Ask about biryani and you get five tax chunks. Not an error — sorted output.
**Nothing in cosine similarity ever says "no match."**

### The score floor

```ts
export const SCORE_FLOOR = Number(process.env.RETRIEVAL_SCORE_FLOOR ?? 0.5);
```

Below this, Phase 4 doesn't call the model at all. Like a smoke detector
threshold: below a level of smoke, don't sound the alarm.

Your junk probes behave exactly as designed:

```
"best biryani restaurant in Dhaka"
1.  0.392   ← below floor
5.  0.381   ← below floor        spread 0.011
```

### Where the floor is not enough

Before you fixed the corpus:

```
"what is the corporate tax rate?"
1.  0.623   minimum-tax.md      ← ABOVE the 0.5 floor
...
5.  0.576   slabs.md            spread 0.047, topics scattered
```

0.623 clears the floor. This question would have reached the model with five
irrelevant chunks attached — and the model would have invented a corporate tax
rate.

And you cannot fix it by raising the floor, because a **correct** retrieval scored
lower:

```
"money I get from renting out my flat"   0.613   ← CORRECT
"what is the corporate tax rate?"        0.623   ← WRONG
```

They overlap. **One threshold on one number cannot separate them.**

### The three signals

The score alone is not enough. Read three things:

| signal | where | tells you |
|---|---|---|
| **who won** | heading + path | did it find the right topic |
| **spread** | rank 1 score − rank 5 score | how confident it is |
| **coherence** | do the 5 rows agree | is the topic dense, or is it guessing |

Spread and coherence together:

| | 5 rows, one topic | 5 rows, scattered |
|---|---|---|
| **big spread** | found one specific answer | found one specific answer |
| **tiny spread** | topic is dense — several fair answers | **found nothing** |

Your two clearest examples:

```
MISS  "festival bonus"     spread 0.024   3 different topics
HIT   "renting my flat"    spread 0.017   all 5 house-property.md
```

The **hit** has the smaller spread. Flatness alone is not failure — flatness
*plus* disagreement is.

And the extremes:

```
confident   "mobile number"   spread 0.303
failed      "biryani"         spread 0.011      ~27x difference
```

### Three ways to fix a scope hole

1. **Fix the corpus** — make the refusal retrievable. You split `out-of-scope.md`
   into ten headings; the corporate tax question went from `·` to rank 1 under
   every strategy. Best outcome: the app can now explain *why* it can't help.
2. **Add a spread check** — refuse when rank 1 − rank 5 is under ~0.05, however
   high the top score. Uses a signal you already compute.
3. **Raise the floor** — simplest, and the worst here, because it would start
   refusing correct answers at 0.613.

Option 1 is the one that made the system genuinely better rather than just more
cautious.

## Why refusing is a feature

A tax assistant that says "I don't cover corporate tax" is **more useful** than
one that invents a rate. The user files a real return with real money.

Fluent and wrong is the worst possible output. It carries all the signals of
being right.

## Common confusions

**"Should I let the model decide if the chunks are relevant?"**
You can — it's called an LLM judge, and it's a real technique. But it costs a call,
adds latency, and asks the component you're trying to constrain to police itself.
Cheap deterministic checks first.

**"Why compute score if ranking uses distance?"**
Ranking uses distance so the index applies. The score is for humans and for the
floor. Same information, two audiences.

**"What if the answer is at rank 6?"**
You never see it. That's what `hit@5` in Part 7 measures — and why probes exist.

**"Should search ever return zero rows?"**
Your `search()` deliberately doesn't filter — it returns what it found and lets
the caller decide. Keeping policy out of the data layer means the CLI can show you
below-floor rows for debugging while Phase 4 refuses on them.

## Go deeper

- Run `npm run search -- "your question" --full` to see the chunk bodies — the exact text Phase 4 will paste into the prompt.
- Look up **re-ranking**: retrieve 20 with cheap vector search, then score those 20 with a slower, more accurate cross-encoder and keep the best 5. The standard next upgrade, and it directly targets your festival-bonus problem.
- Look up **query expansion** and **HyDE**. Your test 10 showed a full sentence beats two keywords by 0.085 — these techniques rewrite short queries before embedding them.
- Look up **Maximal Marginal Relevance (MMR)** — picks five results that are relevant *and* different from each other, instead of five near-duplicates. Directly useful when all five of your hits come from the same file.
- Add a spread check to `search-cli.ts` yourself and re-run the test sheet. You have all the numbers you need.

---

Next: [Part 7 — Measuring](07-measuring.md)
