import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * Splitting corpus files into retrievable pieces.
 *
 * This is a TEXT problem, not an AI problem — no embeddings appear in this file.
 * It is also the highest-leverage decision in the whole RAG pipeline: a chunk is
 * the unit that gets retrieved, so a badly-cut chunk can never be fixed by a
 * better model downstream.
 */

export interface Chunk {
  /** Repo-relative, e.g. "rules/ay-2025-26/corpus/rebate.md". This is what the
   *  Ask tab cites, so it must stay readable to a human. */
  sourceFile: string;
  heading: string;
  /** Heading + body. See chunkMarkdown() for why the heading is included. */
  content: string;
  /** null = year-independent (process content), returned for every year. */
  assessmentYear: string | null;
  wordCount: number;
}

/** Minimal YAML front-matter reader — same shape as scripts/lint-corpus.ts.
 *  The corpus only ever uses flat `key: value` pairs, so a full YAML parser
 *  would be a dependency bought for nothing. */
export function parseFrontMatter(raw: string): {
  data: Record<string, string>;
  body: string;
} {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { data: {}, body: raw };

  const data: Record<string, string> = {};
  for (const line of (match[1] ?? '').split('\n')) {
    const m = line.match(/^(\w+):\s*(.+?)\s*$/);
    if (m?.[1] && m[2]) data[m[1]] = m[2].replace(/^"|"$/g, '');
  }
  return { data, body: match[2] ?? '' };
}

/**
 * Split one corpus file on `##` headings — one idea per chunk.
 *
 * Three decisions worth understanding, because step 5 lets you measure each:
 *
 * 1. SPLIT ON HEADINGS, not a fixed character count. The corpus was authored
 *    "one idea per ## heading", so the headings already mark the seams. Cutting
 *    at 800 characters would slice through the middle of an idea.
 *
 * 2. PREPEND THE HEADING TO THE BODY. The heading carries a lot of the meaning
 *    ("How is the investment rebate calculated?") and it is what a user's
 *    question most resembles. Embedding the body alone measurably hurts.
 *
 * 3. CARRY THE YEAR DOWN from front-matter to every chunk. Retrieval filters on
 *    it, and that filter is what stops a repealed 2025-26 slab surfacing in a
 *    2026-27 answer.
 */
export function chunkMarkdown(raw: string, sourceFile: string): Chunk[] {
  const { data, body } = parseFrontMatter(raw);
  const assessmentYear = data.assessment_year ?? null;

  return body
    .split(/^## /m)
    .slice(1) // drop anything before the first heading (intro prose, if any)
    .map((section) => {
      const newline = section.indexOf('\n');
      const heading = (newline === -1 ? section : section.slice(0, newline)).trim();
      const text = (newline === -1 ? '' : section.slice(newline + 1)).trim();

      const content = `${heading}\n\n${text}`;
      return {
        sourceFile,
        heading,
        content,
        assessmentYear,
        wordCount: content.split(/\s+/).filter(Boolean).length,
      };
    })
    .filter((c) => c.content.length > 40); // a heading with no body is not retrievable
}

/** Every corpus directory: shared first, then one per assessment year. */
export function corpusDirs(): string[] {
  const rules = join(process.cwd(), 'rules');
  if (!existsSync(rules)) return [];

  const dirs: string[] = [];
  const shared = join(rules, 'shared', 'corpus');
  if (existsSync(shared)) dirs.push(shared);

  for (const name of readdirSync(rules).filter((n) => n.startsWith('ay-')).sort()) {
    const corpus = join(rules, name, 'corpus');
    if (existsSync(corpus)) dirs.push(corpus);
  }
  return dirs;
}

/** Chunk the entire corpus. Used by the peek script now, and by the indexer
 *  in step 4 — so what you inspect here is exactly what gets embedded. */
export function chunkCorpus(): Chunk[] {
  const chunks: Chunk[] = [];
  for (const dir of corpusDirs()) {
    for (const file of readdirSync(dir).filter((f) => f.endsWith('.md')).sort()) {
      const path = join(dir, file);
      chunks.push(...chunkMarkdown(readFileSync(path, 'utf8'), relative(process.cwd(), path)));
    }
  }
  return chunks;
}
