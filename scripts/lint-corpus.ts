/**
 * Validate corpus front-matter and heading structure.
 *   npm run lint:corpus
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

function corpusDirs(): string[] {
  const rules = join(process.cwd(), 'rules');
  const dirs: string[] = [];
  const shared = join(rules, 'shared', 'corpus');
  if (existsSync(shared)) dirs.push(shared);

  if (!existsSync(rules)) return dirs;

  for (const name of readdirSync(rules)) {
    if (!name.startsWith('ay-')) continue;
    const corpus = join(rules, name, 'corpus');
    if (existsSync(corpus)) dirs.push(corpus);
  }
  return dirs;
}

function parseFrontMatter(raw: string): { data: Record<string, string>; body: string } | null {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return null;
  const data: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const m = line.match(/^(\w+):\s*"?(.+?)"?\s*$/);
    if (m) data[m[1]] = m[2].replace(/^"|"$/g, '');
  }
  return { data, body: match[2] };
}

let errors = 0;

for (const dir of corpusDirs()) {
  if (!existsSync(dir)) continue;
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.md'))) {
    const path = join(dir, file);
    const where = `${dir.replace(process.cwd() + '/', '')}/${file}`;
    const parsed = parseFrontMatter(readFileSync(path, 'utf8'));

    if (!parsed) {
      console.log(`✗ ${where}: missing --- front-matter`);
      errors++;
      continue;
    }

    const { data, body } = parsed;
    if (!data.topic) {
      console.log(`✗ ${where}: missing topic`);
      errors++;
    }
    if (dir.includes('ay-') && !data.assessment_year) {
      console.log(`✗ ${where}: year corpus needs assessment_year`);
      errors++;
    }
    if (!body.includes('## ')) {
      console.log(`✗ ${where}: no ## headings`);
      errors++;
    }

    for (const section of body.split(/^## /m).slice(1)) {
      const words = section.split(/\s+/).length;
      if (words > 600) console.log(`! ${where}: section ~${words} words — consider splitting`);
      if (words < 30) console.log(`! ${where}: section only ~${words} words`);
    }
  }
}

if (errors) {
  console.log(`\n${errors} error(s).\n`);
  process.exit(1);
}

console.log('\n  corpus lint OK\n');
