/**
 * Phase 3, step 5 — ask the corpus a question from the terminal.
 *
 *   npm run search -- "is my festival bonus taxable?"
 *   npm run search -- "how do I submit my return?" --year 2026-27
 *   npm run search -- "what is the corporate tax rate?"     # watch this one
 *   npm run search -- "investment rebate" --full            # print chunk bodies
 *
 * No LLM here on purpose. If retrieval is wrong, generation cannot save it —
 * so you tune retrieval blind, with no model to hide behind. This CLI stays
 * useful for the rest of the project: every time an answer in the Ask tab looks
 * wrong, the first question is "what did search actually return?"
 */
import { search, SCORE_FLOOR } from '../lib/rag/search';
import { pool } from '../lib/rag/db';

const argv = process.argv.slice(2);
const full = argv.includes('--full');
const yearFlag = argv.indexOf('--year');
const year = yearFlag !== -1 ? argv[yearFlag + 1] : undefined;

// yearAt is the index of --year's VALUE, or -1 when the flag is absent.
// Writing `yearFlag + 1` instead would be 0 when yearFlag is -1, which silently
// drops the first word of every query that has no --year flag.
const yearAt = yearFlag === -1 ? -1 : yearFlag + 1;

const query = argv
  .filter((a, i) => !a.startsWith('--') && i !== yearAt)
  .join(' ')
  .trim();

if (!query) {
  console.error(`
  usage: npm run search -- "your question" [--year 2026-27] [--full]
`);
  process.exit(1);
}

const started = performance.now();
const hits = await search(query, { year });
const ms = Math.round(performance.now() - started);

console.log(`
  "${query}"${year ? `   ·  year ${year}` : '   ·  all years'}   ·  ${ms}ms
`);

if (hits.length === 0) {
  console.log(`  Nothing came back at all — is the table empty? npm run db:check\n`);
  await pool.end();
  process.exit(0);
}

for (const [i, hit] of hits.entries()) {
  // 20-cell bar so the GAP between hits is visible, not just the numbers.
  // The gap matters more than the top score: a clear drop after rank 1 or 2
  // means retrieval found something specific. A flat run of near-identical
  // scores means it found nothing and is returning its five least-bad rows.
  const bar = '█'.repeat(Math.max(0, Math.round(hit.score * 20))).padEnd(20, '·');
  const floor = hit.score < SCORE_FLOOR ? '  ← below floor' : '';

  console.log(
    `  ${i + 1}.  ${hit.score.toFixed(3)}  ${bar}${floor}\n` +
      `      ${hit.heading}\n` +
      `      ${hit.sourceFile}  ·  ${hit.assessmentYear ?? 'shared'}`,
  );

  if (full) {
    const body = hit.content.split('\n').slice(2).join('\n').trim();
    console.log(
      body
        .split('\n')
        .map((line) => `        ${line}`)
        .join('\n'),
    );
  }
  console.log('');
}

const best = hits[0]?.score ?? 0;
if (best < SCORE_FLOOR) {
  console.log(`  Top score ${best.toFixed(3)} is under the floor of ${SCORE_FLOOR}.
  In Phase 4 this question never reaches the model — the app says it doesn't know.
  That refusal is a feature: five weakly-related chunks are exactly the input
  that makes a language model invent a confident, wrong tax rule.
`);
}

await pool.end();
