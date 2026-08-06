/**
 * Phase 3, step 6 — the chunking ablation.
 *
 *   npm run ablate
 *
 * Re-indexes the whole corpus under each chunking strategy and scores the SAME
 * questions against each one. Nothing else changes: same corpus, same model,
 * same SQL. The only variable is where the text was cut.
 *
 * "Ablation" just means: remove or change one component, hold everything else
 * fixed, and see what the number does. It is how you find out whether a design
 * decision was doing any work — as opposed to how it felt at the time.
 *
 * This script is also the seed of Phase 6: PROBES below is `eval/questions.json`
 * with the file names still hard-coded.
 */
import { chunkCorpus, STRATEGIES, type ChunkStrategy } from '../lib/rag/chunk';
import { embed } from '../lib/rag/embed';
import { pool, toVector } from '../lib/rag/db';
import { search, SCORE_FLOOR } from '../lib/rag/search';

/**
 * The expected answer is a FILE, not a chunk id — chunk ids change with every
 * strategy, so scoring against them would make the strategies incomparable.
 * `expect: null` means "nothing should clear the floor".
 */
interface Probe {
  q: string;
  expect: string[] | null;
  year?: string;
}

/**
 * The first run of this sheet used ten probes and eight of them already sat at
 * rank 1. That is a CEILING EFFECT: a test that is nearly saturated cannot show
 * improvement or harm, so the winner came down to a single question.
 *
 * These are chosen to be hard on purpose — heavy paraphrase, rare terms, facts
 * buried mid-chunk, and questions whose answer lives in a long section. If a
 * strategy is genuinely better it has room to prove it here.
 */
const PROBES: Probe[] = [
  // ── scope boundaries: the answer is a refusal, and it must be retrievable ──
  { q: 'what is the corporate tax rate?', expect: ['out-of-scope.md'] },
  { q: 'can this calculate my capital gains?', expect: ['out-of-scope.md'] },
  { q: 'I run a small business, can I use this?', expect: ['out-of-scope.md'] },
  { q: 'does this work if I live abroad?', expect: ['out-of-scope.md'] },
  { q: 'will it file the return for me?', expect: ['out-of-scope.md'] },

  // ── salary: facts buried inside a long section ─────────────────────────────
  { q: 'is my festival bonus taxable?', expect: ['salary-income.md'] },
  { q: 'my employer gave me a car and free housing', expect: ['salary-income.md'] },
  { q: 'what if I worked for two companies this year?', expect: ['salary-income.md'] },
  { q: 'how much of my salary is exempt from tax?', expect: ['salary-income.md'] },

  // ── heavy paraphrase: almost no shared vocabulary with the corpus ──────────
  { q: 'money I get from renting out my flat', expect: ['house-property.md'] },
  { q: 'I get rent and also bank interest', expect: ['house-property.md'] },
  { q: 'which savings schemes reduce my tax?', expect: ['rebate.md'] },
  { q: 'do I have to pay something even if my tax is zero?', expect: ['minimum-tax.md'] },

  // ── rare or abbreviated terms ──────────────────────────────────────────────
  { q: 'does a DPS count?', expect: ['rebate.md'] },
  { q: 'my TDS is not showing on the portal', expect: ['source-tax-verification.md'] },
  { q: 'tax free limit for a woman taxpayer', expect: ['thresholds.md'] },

  // ── process: must come from shared/, no year tag ───────────────────────────
  { q: 'how do I submit my return?', expect: ['filing-process.md'] },
  { q: 'when is the assets statement required?', expect: ['filing-process.md'] },
  { q: 'I changed my mobile number, what should I do?', expect: ['registration.md'] },
  { q: 'how can I pay online with a card?', expect: ['payments.md'] },
  { q: 'what can I print after filing?', expect: ['documents.md'] },
  { q: 'do I need to fill the lifestyle expense statement?', expect: ['expenditure.md'] },
  { q: 'why is my source tax not verified?', expect: ['source-tax-verification.md'] },

  // ── year-sensitive ─────────────────────────────────────────────────────────
  { q: 'what are the tax slabs?', expect: ['slabs.md', 'thresholds.md'], year: '2026-27' },
  { q: 'how is the investment rebate calculated?', expect: ['rebate.md'] },
  { q: 'what is the last date to file?', expect: ['deadlines.md'] },
  { q: 'what happens if I file late?', expect: ['rebate.md', 'deadlines.md'] },
  { q: 'difference between income year and assessment year', expect: ['deadlines.md'] },

  // ── junk: success means NOTHING clears the floor ───────────────────────────
  { q: 'best biryani restaurant in Dhaka', expect: null },
  { q: 'how do I cook chicken korma', expect: null },
];

interface Result {
  strategy: ChunkStrategy;
  chunks: number;
  avgWords: number;
  /** 1-5, or 0 when the expected file never appeared in the top five. */
  ranks: number[];
  topScores: number[];
  seconds: number;
}

async function indexWith(strategy: ChunkStrategy) {
  const chunks = chunkCorpus(strategy);
  await pool.query('TRUNCATE chunks RESTART IDENTITY');
  for (const c of chunks) {
    await pool.query(
      `INSERT INTO chunks (source_file, heading, content, assessment_year, embedding)
       VALUES ($1, $2, $3, $4, $5::vector)`,
      [c.sourceFile, c.heading, c.content, c.assessmentYear, toVector(await embed(c.content))],
    );
  }
  await pool.query('ANALYZE chunks');
  return chunks;
}

const results: Result[] = [];

for (const strategy of STRATEGIES) {
  const started = performance.now();
  process.stdout.write(`  ${strategy.padEnd(11)} indexing… `);
  const chunks = await indexWith(strategy);
  process.stdout.write(`${chunks.length} chunks, probing… `);

  const ranks: number[] = [];
  const topScores: number[] = [];

  for (const p of PROBES) {
    const hits = await search(p.q, { year: p.year });
    topScores.push(hits[0]?.score ?? 0);

    if (p.expect === null) {
      // Success here means the OPPOSITE: nothing clears the floor.
      ranks.push((hits[0]?.score ?? 0) < SCORE_FLOOR ? 1 : 0);
      continue;
    }
    ranks.push(hits.findIndex((h) => p.expect!.some((f) => h.sourceFile.endsWith(f))) + 1);
  }

  results.push({
    strategy,
    chunks: chunks.length,
    avgWords: Math.round(chunks.reduce((s, c) => s + c.wordCount, 0) / chunks.length),
    ranks,
    topScores,
    seconds: (performance.now() - started) / 1000,
  });
  console.log(`${((performance.now() - started) / 1000).toFixed(0)}s`);
}

// ── per-probe rank matrix ────────────────────────────────────────────────────
console.log(`\n  RANK OF THE EXPECTED FILE  (1 = top hit, · = not in top 5)\n`);
const cell = (r: number) => (r === 0 ? ' ·' : String(r).padStart(2));
console.log(`  ${'question'.padEnd(46)} ${STRATEGIES.map((s) => s.slice(0, 9).padStart(10)).join('')}`);
for (const [i, p] of PROBES.entries()) {
  const label = (p.expect === null ? '(junk) ' : '') + p.q;
  console.log(
    `  ${label.slice(0, 46).padEnd(46)} ${results.map((r) => cell(r.ranks[i] ?? 0).padStart(10)).join('')}`,
  );
}

// ── summary ─────────────────────────────────────────────────────────────────
const hitAt = (r: Result, n: number) => r.ranks.filter((x) => x > 0 && x <= n).length;
/** Mean reciprocal rank: rank 1 scores 1.0, rank 2 scores 0.5, rank 5 scores
 *  0.2, a miss scores 0. One number that rewards "right answer, higher up". */
const mrr = (r: Result) => r.ranks.reduce((s, x) => s + (x > 0 ? 1 / x : 0), 0) / r.ranks.length;

console.log(`\n  SUMMARY\n`);
console.log(`  ${'strategy'.padEnd(12)} ${'chunks'.padStart(7)} ${'avg words'.padStart(10)} ${'hit@1'.padStart(7)} ${'hit@5'.padStart(7)} ${'MRR'.padStart(7)} ${'index'.padStart(7)}`);
for (const r of results) {
  console.log(
    `  ${r.strategy.padEnd(12)} ${String(r.chunks).padStart(7)} ${String(r.avgWords).padStart(10)}` +
      ` ${`${hitAt(r, 1)}/${PROBES.length}`.padStart(7)} ${`${hitAt(r, 5)}/${PROBES.length}`.padStart(7)}` +
      ` ${mrr(r).toFixed(3).padStart(7)} ${`${r.seconds.toFixed(0)}s`.padStart(7)}`,
  );
}

const winner = [...results].sort((a, b) => mrr(b) - mrr(a))[0]!;
const baseline = results.find((r) => r.strategy === 'heading')!;

console.log(`
  Best MRR: ${winner.strategy} (${mrr(winner).toFixed(3)})   baseline heading: ${mrr(baseline).toFixed(3)}

  MRR is one number, so it hides things. Read the rank matrix too — a strategy
  can lift the average while breaking one question you actually care about.

  The database is currently indexed with "${results[results.length - 1]?.strategy}".
  Restore your chosen strategy before anything else:

     npm run index                          # heading (default)
     CHUNK_STRATEGY=${winner.strategy} npm run index${' '.repeat(Math.max(0, 22 - winner.strategy.length))}# the winner here
`);

await pool.end();
