/**
 * Replay eval — the spine of this project.
 *
 * Feeds a previously FILED return back through the calculator and asserts it
 * reproduces the tax actually paid. This is real ground truth, and it doubles
 * as verification of the transcribed rule figures: if an unverified config
 * reproduces a filed return exactly, the figures are almost certainly right.
 *
 *   npm run eval
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { bdt, computeTax, loadYearConfig, round2 } from '../lib/calc/index';
import type { TaxInputs } from '../lib/calc/index';

interface ReturnFixture {
  assessment_year: string;
  _compare?: 'net_tax' | 'payable' | 'total_income';
  inputs: TaxInputs;
  filed_result: { total_income?: number; net_tax?: number; payable?: number };
}

const RETURNS_DIR = join(process.cwd(), 'private', 'returns');
const TOLERANCE = 1; // taka — rounding differences below this are not failures

function loadFixtures(): { file: string; fixture: ReturnFixture }[] {
  let files: string[];
  try {
    files = readdirSync(RETURNS_DIR);
  } catch {
    return [];
  }

  return files
    .filter((f) => f.endsWith('.json') && !f.endsWith('.example.json'))
    .sort()
    .map((file) => ({
      file,
      fixture: JSON.parse(readFileSync(join(RETURNS_DIR, file), 'utf8')) as ReturnFixture,
    }));
}

function main(): void {
  const fixtures = loadFixtures();

  if (fixtures.length === 0) {
    console.log('\n  No filed returns found in private/returns/\n');
    console.log('  Copy private/returns/2025-26.example.json to 2025-26.json');
    console.log('  and fill in your real figures, then run again.\n');
    process.exit(0);
  }

  console.log('');
  let failures = 0;

  for (const { file, fixture } of fixtures) {
    const config = loadYearConfig(fixture.assessment_year);
    const result = computeTax(config, fixture.inputs);

    const compare = fixture._compare ?? 'net_tax';
    const expected = fixture.filed_result[compare];

    if (expected === undefined) {
      console.log(`  ?  ${file} — filed_result.${compare} is missing, skipped`);
      continue;
    }

    const actual = result[compare];
    const diff = round2(actual - expected);
    const pass = Math.abs(diff) <= TOLERANCE;
    if (!pass) failures++;

    const mark = pass ? '✓' : '✗';
    console.log(
      `  ${mark}  ${file}  ${compare}  ->  ${bdt(actual)}   expected ${bdt(expected)}` +
        (pass ? '' : `   diff ${diff > 0 ? '+' : ''}${bdt(diff)}`),
    );

    if (!pass) {
      // Show the working so the gap is findable without a debugger.
      console.log('');
      console.log(`       gross salary        ${bdt(result.gross_salary)}`);
      console.log(`       salary exemption   -${bdt(result.salary_exemption)}`);
      console.log(`       taxable salary      ${bdt(result.taxable_salary)}`);
      console.log(`       house property      ${bdt(result.house_property_income)}`);
      console.log(`       bank interest       ${bdt(result.bank_interest)}`);
      console.log(`       other income        ${bdt(result.other_income)}`);
      console.log(`       total income        ${bdt(result.total_income)}`);
      if (fixture.filed_result.total_income) {
        console.log(`         (filed)           ${bdt(fixture.filed_result.total_income)}`);
      }
      console.log(`       exempt threshold   -${bdt(result.exempt_threshold)}`);
      console.log(`       taxable            = ${bdt(result.taxable_above_threshold)}`);
      for (const row of result.band_rows) {
        if (row.amount_taxed <= 0) continue;
        console.log(
          `         ${row.band.padEnd(22)} @ ${(row.rate * 100).toFixed(0).padStart(2)}%  on ${bdt(row.amount_taxed).padStart(12)}  = ${bdt(row.tax)}`,
        );
      }
      console.log(`       gross tax           ${bdt(result.gross_tax)}`);
      console.log(`       rebate             -${bdt(result.rebate)}  (bound by: ${result.rebate_binding})`);
      console.log(`       after rebate        ${bdt(result.tax_after_rebate)}`);
      if (result.minimum_tax_applied) console.log('       minimum tax floor applied');
      console.log(`       net tax             ${bdt(result.net_tax)}`);
      console.log('');
    }

    for (const w of result.warnings) console.log(`       ! ${w}`);
  }

  console.log('');
  if (failures > 0) {
    console.log(`  ${failures} of ${fixtures.length} failed.\n`);
    console.log('  A mismatch means one of:');
    console.log('    - a rule figure in rules/ay-*/config.json is wrong');
    console.log('    - a rule is modelled wrongly (see the _verify list in the config)');
    console.log('    - an income head the calculator does not support yet\n');
    process.exit(1);
  }

  console.log(`  ${fixtures.length} passed.\n`);
}

main();
