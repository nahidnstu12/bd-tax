import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import type { YearConfig } from './types';

const RULES_DIR = join(process.cwd(), 'rules');

/**
 * Load the rule config for one assessment year.
 *
 * Years are data, not code — a new year is a new folder, and old years are
 * never mutated (the replay eval depends on them staying fixed).
 */
export function loadYearConfig(assessmentYear: string): YearConfig {
  const path = join(RULES_DIR, `ay-${assessmentYear}`, 'config.json');
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as YearConfig;
  } catch {
    throw new Error(
      `No config for assessment year "${assessmentYear}" (looked in ${path}). ` +
        `Available: ${listYears().join(', ') || 'none'}`,
    );
  }
}

/** Assessment years that have a config folder. */
export function listYears(): string[] {
  try {
    return readdirSync(RULES_DIR)
      .filter((d) => d.startsWith('ay-'))
      .map((d) => d.slice(3))
      .sort();
  } catch {
    return [];
  }
}
