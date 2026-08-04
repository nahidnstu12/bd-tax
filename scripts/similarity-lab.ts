/**
 * Phase 3, step 2 — the step that makes embeddings click. Still no database.
 *
 *   npm run sim:lab
 *   npm run sim:lab -- "your sentence" "another sentence" ...
 *
 * PREDICT BEFORE YOU RUN. Write down which pair you think scores highest, and
 * roughly what the out-of-scope question scores. Being wrong is the point —
 * that gap is the thing you are actually here to learn.
 */
import { embed } from '../lib/rag/embed';
import { cosineSimilarity, magnitude } from '../lib/rag/similarity';

/**
 * Chosen so each pair isolates one lesson:
 *   S1 vs S2  same idea, almost no shared words  → meaning, not keywords
 *   S1 vs S3  both tax, different topic          → topical but wrong
 *   S1 vs S4  tax vocabulary, out of scope       → the dangerous middle
 *   S1 vs S5  unrelated                          → the floor of the space
 */
const DEFAULT_SENTENCES = [
  'is my festival bonus taxable?',
  'bonus received from an employer is treated as salary income',
  'deposit pension scheme qualifies for the investment rebate',
  'what is the corporate tax rate?',
  'my cat is orange',
];

const sentences = process.argv.length > 2 ? process.argv.slice(2) : DEFAULT_SENTENCES;

console.log('\n  embedding locally via Ollama...\n');
const vectors: number[][] = [];
for (const s of sentences) vectors.push(await embed(s));

// ── the sentences ────────────────────────────────────────────────────────────
sentences.forEach((s, i) => {
  console.log(`  S${i + 1}  "${s}"`);
});

// ── the matrix ───────────────────────────────────────────────────────────────
const header = sentences.map((_, i) => `    S${i + 1}`).join('');
console.log(`\n       ${header}`);

vectors.forEach((a, i) => {
  const row = vectors
    .map((b, j) => {
      const score = cosineSimilarity(a, b);
      // Diagonal is a vector against itself: must be 1.000. If it is not,
      // the maths is wrong — that is a free self-test on every run.
      return i === j ? '  1.00' : ` ${score.toFixed(2).padStart(5)}`;
    })
    .join('');
  console.log(`   S${i + 1} ${row}`);
});

// ── ranked pairs — easier to read than the matrix ────────────────────────────
const pairs: { a: number; b: number; score: number }[] = [];
for (let i = 0; i < vectors.length; i++) {
  for (let j = i + 1; j < vectors.length; j++) {
    pairs.push({ a: i, b: j, score: cosineSimilarity(vectors[i]!, vectors[j]!) });
  }
}
pairs.sort((x, y) => y.score - x.score);

console.log('\n  most similar pairs, ranked\n');
for (const p of pairs) {
  const bar = '█'.repeat(Math.max(0, Math.round(p.score * 30)));
  console.log(`   ${p.score.toFixed(3)}  S${p.a + 1}↔S${p.b + 1}  ${bar}`);
}

// ── the observation that motivates the whole system ──────────────────────────
console.log(`
  magnitudes: ${vectors.map((v) => magnitude(v).toFixed(2)).join(', ')}
  Not 1.0 — so cosine MUST divide by them. A raw dot product would rank by
  length as much as by meaning.

  Two things to notice:

  1. S1 and S2 share almost no words ("festival bonus taxable" vs "employer
     salary income") yet score high. Nothing matched text. The embeddings
     landed near each other because the MEANING is close. That is the entire
     foundation of retrieval.

  2. Now look at what S1 scores against S4 and S5. The out-of-scope question
     is not near zero — it shares tax vocabulary, so it sits in an awkward
     middle. Cosine search will happily return it as a "best match" when
     nothing better exists, because there is no such thing as "no results".
     That number is why Phase 4 needs a score floor.
`);
