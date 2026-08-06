import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, join, relative } from 'node:path';

/**
 * Splitting corpus files into retrievable pieces.
 *
 * This is a TEXT problem, not an AI problem — no embeddings appear in this file.
 * It is also the highest-leverage decision in the whole RAG pipeline: a chunk is
 * the unit that gets retrieved, so a badly-cut chunk can never be fixed by a
 * better model downstream.
 *
 * Five strategies live here so you can MEASURE that claim rather than believe
 * it. `npm run ablate` re-indexes under each one and scores the same questions.
 */

export interface Chunk {
  /** Repo-relative, e.g. "rules/ay-2025-26/corpus/rebate.md". This is what the
   *  Ask tab cites, so it must stay readable to a human. */
  sourceFile: string;
  heading: string;
  /** Exactly the text that gets embedded. What goes in here IS the strategy. */
  content: string;
  /** null = year-independent (process content), returned for every year. */
  assessmentYear: string | null;
  wordCount: number;
}

/**
 * - `heading`    one chunk per `##` section, heading prepended to the body.
 *                The default, and the shipping choice.
 * - `no-heading` same cuts, but the heading is NOT prepended. Isolates exactly
 *                what that one line of prose is worth.
 * - `sentence`   one chunk per sentence or list row, heading still prepended.
 *                Much smaller units — tests whether dilution is the problem.
 * - `fixed`      ignore document structure entirely; 800-character windows.
 *                What a naive RAG tutorial does.
 * - `file`       one chunk per file. Dilution taken to its logical extreme.
 */
export type ChunkStrategy = 'heading' | 'no-heading' | 'sentence' | 'fixed' | 'file';

export const STRATEGIES: ChunkStrategy[] = ['heading', 'no-heading', 'sentence', 'fixed', 'file'];

/** Lets `CHUNK_STRATEGY=sentence npm run index` re-index without a code edit. */
export function currentStrategy(): ChunkStrategy {
  const s = process.env.CHUNK_STRATEGY as ChunkStrategy | undefined;
  return s && STRATEGIES.includes(s) ? s : 'heading';
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

interface Section {
  heading: string;
  body: string;
}

/** Cut a file body at its `##` headings. The corpus was authored one idea per
 *  heading, so the seams are already marked — no need to guess where to cut. */
function sections(body: string): Section[] {
  return body
    .split(/^## /m)
    .slice(1) // drop anything before the first heading (intro prose, if any)
    .map((section) => {
      const newline = section.indexOf('\n');
      return {
        heading: (newline === -1 ? section : section.slice(0, newline)).trim(),
        body: (newline === -1 ? '' : section.slice(newline + 1)).trim(),
      };
    });
}

/**
 * Break a section body into sentences and list rows.
 *
 * Deliberately crude — a real sentence splitter is its own rabbit hole, and the
 * point here is to test whether SMALLER units help at all, not to split
 * perfectly. Fragments under 40 characters get merged into the previous unit so
 * "e.g." and abbreviations do not produce useless one-word chunks.
 */
function splitUnits(body: string): string[] {
  const units: string[] = [];
  let paragraph: string[] = [];

  const flush = () => {
    if (paragraph.length === 0) return;
    const text = paragraph.join(' ');
    for (const s of text.split(/(?<=[.!?])\s+(?=[A-Z"'*\d(])/)) {
      const trimmed = s.trim();
      if (!trimmed) continue;
      const prev = units[units.length - 1];
      // Merge a fragment into its neighbour rather than emit a stub.
      if (prev && (trimmed.length < 40 || prev.length < 40)) units[units.length - 1] = `${prev} ${trimmed}`;
      else units.push(trimmed);
    }
    paragraph = [];
  };

  for (const line of body.split('\n')) {
    const t = line.trim();
    if (!t) {
      flush();
    } else if (/^([-*|]|\d+\.)/.test(t)) {
      // A list row or table row is already one idea — keep it whole.
      flush();
      units.push(t);
    } else {
      paragraph.push(t);
    }
  }
  flush();
  return units;
}

/** Fixed-width windows that respect word boundaries and nothing else. */
function fixedWindows(text: string, size = 800): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const out: string[] = [];
  let buf = '';
  for (const w of words) {
    if (buf.length + w.length + 1 > size) {
      out.push(buf);
      buf = w;
    } else {
      buf = buf ? `${buf} ${w}` : w;
    }
  }
  if (buf) out.push(buf);
  return out;
}

const words = (s: string) => s.split(/\s+/).filter(Boolean).length;

/**
 * Split one corpus file into chunks under the given strategy.
 *
 * Three decisions the default strategy makes, each of which `npm run ablate`
 * can now put a number on:
 *
 * 1. SPLIT ON HEADINGS, not a fixed character count  ->  compare `fixed`
 * 2. PREPEND THE HEADING to the body                 ->  compare `no-heading`
 * 3. ONE SECTION PER CHUNK                           ->  compare `sentence`, `file`
 *
 * The year always comes from front-matter and rides down to every chunk.
 * Retrieval filters on it, and that filter is what stops a repealed 2025-26 slab
 * surfacing in a 2026-27 answer.
 */
export function chunkMarkdown(
  raw: string,
  sourceFile: string,
  strategy: ChunkStrategy = currentStrategy(),
): Chunk[] {
  const { data, body } = parseFrontMatter(raw);
  const assessmentYear = data.assessment_year ?? null;
  const base = basename(sourceFile);
  const make = (heading: string, content: string): Chunk => ({
    sourceFile,
    heading,
    content,
    assessmentYear,
    wordCount: words(content),
  });

  let out: Chunk[];

  switch (strategy) {
    case 'file':
      out = [make(base, body.trim())];
      break;

    case 'fixed':
      out = fixedWindows(body.replace(/^#+ /gm, '')).map((w, i) => make(`${base} [${i + 1}]`, w));
      break;

    case 'sentence':
      out = sections(body).flatMap((s) =>
        splitUnits(s.body).map((u) => make(s.heading, `${s.heading}\n\n${u}`)),
      );
      break;

    case 'no-heading':
      out = sections(body).map((s) => make(s.heading, s.body));
      break;

    default:
      out = sections(body).map((s) => make(s.heading, `${s.heading}\n\n${s.body}`));
  }

  // A heading with no body, or a stray fragment, is not retrievable.
  return out.filter((c) => c.content.length > 40);
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

/** Chunk the entire corpus. Used by chunk:peek, index, and ablate — so what you
 *  inspect is exactly what gets embedded. */
export function chunkCorpus(strategy: ChunkStrategy = currentStrategy()): Chunk[] {
  const chunks: Chunk[] = [];
  for (const dir of corpusDirs()) {
    for (const file of readdirSync(dir).filter((f) => f.endsWith('.md')).sort()) {
      const path = join(dir, file);
      chunks.push(
        ...chunkMarkdown(readFileSync(path, 'utf8'), relative(process.cwd(), path), strategy),
      );
    }
  }
  return chunks;
}
