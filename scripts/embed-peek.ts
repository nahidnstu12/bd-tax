/**
 * Phase 3, step 1 — look at an embedding with your own eyes.
 *
 *   npm run embed:peek
 *   npm run embed:peek -- "is my festival bonus taxable?"
 *
 * No database, no chunking, no search. Just: text in, numbers out.
 * The whole mystery of "what is an embedding" should be gone after one run.
 */
import { embed, MODEL, DIMENSIONS } from '../lib/rag/embed';

const text = process.argv.slice(2).join(' ') || 'festival bonus';

const t0 = performance.now();
const vec = await embed(text);
const ms = Math.round(performance.now() - t0);

// Magnitude matters later: cosine similarity divides by it. nomic-embed-text
// does NOT return unit vectors, so you cannot skip that division (step 2).
const magnitude = Math.sqrt(vec.reduce((sum, x) => sum + x * x, 0));

console.log(`
  text        "${text}"
  model       ${MODEL}   (${ms} ms, local)

  length      ${vec.length}${vec.length === DIMENSIONS ? '  ✓ matches vector(768) in db/schema.sql' : ''}
  first 8     [${vec.slice(0, 8).map((n) => n.toFixed(4)).join(', ')}, ...]
  range       min ${Math.min(...vec).toFixed(4)}   max ${Math.max(...vec).toFixed(4)}
  magnitude   ${magnitude.toFixed(4)}   ${magnitude.toFixed(2) === '1.00' ? '(unit vector)' : '(NOT a unit vector — step 2 must divide by this)'}

  That is the entire thing. ${vec.length} numbers standing in for the meaning of
  the text. Nothing was "understood" — the position in this space IS the meaning,
  and step 2 shows that two texts about the same idea land near each other.
`);
