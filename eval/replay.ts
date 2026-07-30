/**
 * Replay eval — the spine of this project.
 *
 * Feeds a previously FILED return back through the calculator and asserts every
 * figure present in `filed_result` (income chain + tax lines). A fixture that
 * only sets `net_tax` can still pass while `total_income` is wrong — so real
 * returns should assert the full chain.
 *
 *   npm run eval
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { bdt, computeTax, loadYearConfig, round2 } from '../lib/calc/index';
import type { Breakdown, TaxInputs, YearConfig } from '../lib/calc/index';

/** Keys in fixture JSON → value from calculator (or derived for form line 15). */
const FILED_ASSERTIONS: {
  filedKey: keyof FiledResult;
  label: string;
  actual: (ctx: {
    result: Breakdown;
    config: YearConfig;
    inputs: TaxInputs;
  }) => number;
}[] = [
  { filedKey: 'gross_salary', label: 'gross salary', actual: ({ result }) => result.gross_salary },
  {
    filedKey: 'salary_exemption',
    label: 'salary exemption',
    actual: ({ result }) => result.salary_exemption,
  },
  {
    filedKey: 'taxable_salary',
    label: 'taxable salary',
    actual: ({ result }) => result.taxable_salary,
  },
  { filedKey: 'total_income', label: 'total income', actual: ({ result }) => result.total_income },
  { filedKey: 'gross_tax', label: 'gross tax', actual: ({ result }) => result.gross_tax },
  { filedKey: 'rebate', label: 'rebate', actual: ({ result }) => result.rebate },
  {
    filedKey: 'tax_after_rebate',
    label: 'tax after rebate',
    actual: ({ result }) => result.tax_after_rebate,
  },
  { filedKey: 'net_tax', label: 'net tax', actual: ({ result }) => result.net_tax },
  {
    filedKey: 'minimum_tax',
    label: 'minimum tax (form line)',
    actual: ({ result, config, inputs }) => minimumTaxFormLine(result, config, inputs),
  },
  { filedKey: 'payable', label: 'payable', actual: ({ result }) => result.payable },
  { filedKey: 'refundable', label: 'refundable', actual: ({ result }) => result.refundable },
  {
    filedKey: 'lifestyle_expense_total',
    label: 'lifestyle expenses',
    actual: ({ result }) => result.wealth.lifestyle_expense_total,
  },
  {
    filedKey: 'total_sources',
    label: 'wealth total sources',
    actual: ({ result }) => result.wealth.total_sources,
  },
  {
    filedKey: 'closing_net_wealth',
    label: 'closing net wealth',
    actual: ({ result }) => result.wealth.closing_net_wealth,
  },
  {
    filedKey: 'wealth_difference',
    label: 'wealth difference',
    actual: ({ result }) => result.wealth.wealth_difference,
  },
];

interface FiledResult {
  gross_salary?: number;
  salary_exemption?: number;
  taxable_salary?: number;
  total_income?: number;
  gross_tax?: number;
  rebate?: number;
  tax_after_rebate?: number;
  net_tax?: number;
  minimum_tax?: number;
  payable?: number;
  refundable?: number;
  lifestyle_expense_total?: number;
  total_sources?: number;
  closing_net_wealth?: number;
  wealth_difference?: number;
}

interface ReturnFixture {
  assessment_year: string;
  /** @deprecated All keys in filed_result are asserted; kept for old fixtures only. */
  _compare?: 'net_tax' | 'payable' | 'total_income';
  inputs: TaxInputs;
  filed_result: FiledResult;
}

const RETURNS_DIR = join(process.cwd(), 'private', 'returns');
const TOLERANCE = 1; // taka — rounding differences below this are not failures

/** NBR minimum-tax line when the floor is not triggered is 0; when it binds, the floor amount. */
function minimumTaxFormLine(result: Breakdown, config: YearConfig, inputs: TaxInputs): number {
  if (!result.minimum_tax_applied) return 0;
  return inputs.is_first_time_filer
    ? config.minimum_tax.first_time_filer
    : config.minimum_tax.standard;
}

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

function assertionsForFixture(fixture: ReturnFixture): typeof FILED_ASSERTIONS {
  const filed = fixture.filed_result;
  return FILED_ASSERTIONS.filter((a) => filed[a.filedKey] !== undefined);
}

function printWorking(
  result: Breakdown,
  fixture: ReturnFixture,
  mismatches: { label: string; actual: number; expected: number; diff: number }[],
): void {
  console.log('');
  for (const m of mismatches) {
    console.log(
      `       ✗ ${m.label.padEnd(22)} calc ${bdt(m.actual).padStart(12)}   filed ${bdt(m.expected).padStart(12)}   diff ${m.diff > 0 ? '+' : ''}${bdt(m.diff)}`,
    );
  }
  console.log('');
  console.log(`       gross salary        ${bdt(result.gross_salary)}`);
  console.log(`       salary exemption   -${bdt(result.salary_exemption)}`);
  console.log(`       taxable salary      ${bdt(result.taxable_salary)}`);
  console.log(`       house property      ${bdt(result.house_property_income)}`);
  console.log(`       bank interest       ${bdt(result.bank_interest)}`);
  console.log(`       other income        ${bdt(result.other_income)}`);
  console.log(`       total income        ${bdt(result.total_income)}`);
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
  console.log(`       payable             ${bdt(result.payable)}`);
  console.log(`       refundable          ${bdt(result.refundable)}`);
  console.log(`       lifestyle expenses  ${bdt(result.wealth.lifestyle_expense_total)}`);
  console.log(`       wealth sources      ${bdt(result.wealth.total_sources)}`);
  console.log(`       wealth outflows     ${bdt(result.wealth.total_outflows)}`);
  console.log(`       closing net wealth  ${bdt(result.wealth.closing_net_wealth)}`);
  if (result.wealth.declared_closing_net_wealth != null) {
    console.log(`       wealth difference   ${bdt(result.wealth.wealth_difference)}`);
  }
  console.log('');

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
  let fileFailures = 0;

  for (const { file, fixture } of fixtures) {
    const config = loadYearConfig(fixture.assessment_year);
    const result = computeTax(config, fixture.inputs);
    const checks = assertionsForFixture(fixture);

    if (checks.length === 0) {
      console.log(`  ?  ${file} — filed_result is empty, skipped`);
      continue;
    }

    const mismatches: { label: string; actual: number; expected: number; diff: number }[] = [];

    for (const check of checks) {
      const expected = fixture.filed_result[check.filedKey] as number;
      const actual = check.actual({ result, config, inputs: fixture.inputs });
      const diff = round2(actual - expected);
      if (Math.abs(diff) > TOLERANCE) {
        mismatches.push({ label: check.label, actual, expected, diff });
      }
    }

    const pass = mismatches.length === 0;
    if (!pass) fileFailures++;

    const mark = pass ? '✓' : '✗';
    const summary = pass
      ? `${checks.length} line(s) within ${TOLERANCE} taka`
      : `${mismatches.length} mismatch(es)`;
    console.log(`  ${mark}  ${file}  ${summary}`);

    if (!pass) printWorking(result, fixture, mismatches);

    for (const w of result.warnings) console.log(`       ! ${w}`);
  }

  console.log('');
  if (fileFailures > 0) {
    console.log(`  ${fileFailures} of ${fixtures.length} failed.\n`);
    console.log('  A mismatch means one of:');
    console.log('    - a rule figure in rules/ay-*/config.json is wrong');
    console.log('    - a rule is modelled wrongly (see the _verify list in the config)');
    console.log('    - an income head the calculator does not support yet\n');
    process.exit(1);
  }

  console.log(`  ${fixtures.length} passed.\n`);
}

main();
