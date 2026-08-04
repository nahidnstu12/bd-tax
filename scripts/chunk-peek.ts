/**
 * Phase 3, step 3 — see exactly what will be embedded. Still no database.
 *
 *   npm run chunk:peek
 *   npm run chunk:peek -- rebate      # only files matching "rebate"
 *   npm run chunk:peek -- --full      # print whole chunk bodies
 *
 * PREDICT FIRST: how many chunks do you expect from 21 corpus files?
 *
 * Read a few chunks as if you were the retriever — alone, with no file around
 * them. If a chunk says "it" or "the above", nothing downstream can recover
 * that context.
 */
import { chunkCorpus } from '../lib/rag/chunk';

const args = process.argv.slice(2);
const full = args.includes('--full');
const filter = args.find((a) => !a.startsWith('--'));

const all = chunkCorpus();
const chunks = filter ? all.filter((c) => c.sourceFile.includes(filter)) : all;

let currentFile = '';
for (const c of chunks) {
  if (c.sourceFile !== currentFile) {
    currentFile = c.sourceFile;
    const year = c.assessmentYear ?? 'shared — returned for EVERY year';
    console.log(`\n  ${currentFile}   [${year}]`);
  }

  // Flag sizes against the Phase 2 authoring target of 150-500 words.
  const flag = c.wordCount < 30 ? ' ← thin' : c.wordCount > 600 ? ' ← split this' : '';
  console.log(`     ${String(c.wordCount).padStart(4)}w  ${c.heading}${flag}`);

  if (full) console.log(`\n${c.content.replace(/^/gm, '            ')}\n`);
}

// ── what the numbers mean ────────────────────────────────────────────────────
const words = chunks.map((c) => c.wordCount);
const avg = Math.round(words.reduce((a, b) => a + b, 0) / (words.length || 1));
const shared = chunks.filter((c) => c.assessmentYear === null).length;
const years = new Set(chunks.map((c) => c.assessmentYear).filter(Boolean));

console.log(`
  ${chunks.length} chunks   avg ${avg}w   min ${Math.min(...words)}w   max ${Math.max(...words)}w
  ${shared} year-independent  ·  ${chunks.length - shared} across ${years.size} year(s): ${[...years].join(', ')}

  Two things to check by eye, because no metric will catch them:

  1. Does each heading read like a question someone would actually ask? That is
     what the user's question gets compared against.

  2. Pick a chunk at random and read ONLY that chunk. Does it stand alone? A
     chunk is retrieved without the file around it, so "it" and "as above" are
     unrecoverable — the model will never see what they referred to.

  Phase 6 will make chunk size measurable. For now, judge by eye — but judge.
`);
