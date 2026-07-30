/**
 * Ad-hoc calculator — print a full breakdown for one scenario.
 *
 *   npm run calc                          # built-in sample, AY 2025-26
 *   npm run calc -- 2026-27               # same sample, different year
 *   npm run calc -- 2025-26 private/returns/2025-26.json
 */

import { readFileSync } from 'node:fs';

import { bdt, computeTax, listYears, loadYearConfig } from '../lib/calc/index';
import type { TaxInputs } from '../lib/calc/index';

const SAMPLE: TaxInputs = {
  category: 'general',
  is_parent_of_disabled: false,
  is_first_time_filer: false,
  salary: {
    basic: 800000,
    house_rent_allowance: 400000,
    medical_allowance: 80000,
    conveyance_allowance: 0,
    bonus: 130000,
    other_allowances: 0,
    non_cash_benefits: 0,
  },
  house_property_income: 180000,
  bank_interest: 110400,
  other_income: 60000,
  eligible_investment: 300000,
  source_tax: 10000,
  advance_tax: 0,
};

const [yearArg, fileArg] = process.argv.slice(2);
const year = yearArg ?? listYears().at(-1) ?? '2025-26';

const inputs: TaxInputs = fileArg
  ? (JSON.parse(readFileSync(fileArg, 'utf8')).inputs as TaxInputs)
  : SAMPLE;

const config = loadYearConfig(year);
const r = computeTax(config, inputs);

const line = (label: string, value: number, sign = ' ') =>
  console.log(`  ${label.padEnd(26)} ${sign}${bdt(value).padStart(14)}`);

console.log(`\n  Assessment Year ${r.assessment_year}${r.config_verified ? '' : '   [UNVERIFIED CONFIG]'}`);
console.log(`  ${fileArg ?? 'built-in sample'}\n`);

line('Gross salary', r.gross_salary);
line('Salary exemption', r.salary_exemption, '-');
line('Taxable salary', r.taxable_salary);
line('House property', r.house_property_income);
line('Bank interest', r.bank_interest);
line('Other income', r.other_income);
line('TOTAL INCOME', r.total_income);
console.log('');
line('Exempt threshold', r.exempt_threshold, '-');
line('Taxable above threshold', r.taxable_above_threshold);
console.log('');
for (const row of r.band_rows) {
  if (row.amount_taxed <= 0) continue;
  console.log(
    `    ${row.band.padEnd(24)} @ ${(row.rate * 100).toFixed(0).padStart(2)}%  on ${bdt(row.amount_taxed).padStart(12)}  = ${bdt(row.tax)}`,
  );
}
console.log('');
line('Gross tax', r.gross_tax);
line(`Rebate (bound: ${r.rebate_binding})`, r.rebate, '-');
line('Tax after rebate', r.tax_after_rebate);
if (r.minimum_tax_applied) console.log('    minimum tax floor applied');
line('NET TAX', r.net_tax);
console.log('');
line('Source tax', r.source_tax, '-');
line('Advance tax', r.advance_tax, '-');
line(r.refundable > 0 ? 'REFUNDABLE' : 'PAYABLE', r.refundable > 0 ? r.refundable : r.payable);

console.log('\n  --- Expenditure & wealth (e-Return tabs) ---\n');
line('Lifestyle expenses total', r.wealth.lifestyle_expense_total);
line('Prior net wealth', r.wealth.prior_net_wealth);
line('Total sources of fund', r.wealth.total_sources);
line('Total outflows', r.wealth.total_outflows);
line('Closing net wealth (calc)', r.wealth.closing_net_wealth);
if (r.wealth.declared_closing_net_wealth != null) {
  line('Declared closing wealth', r.wealth.declared_closing_net_wealth);
  line('Wealth difference', r.wealth.wealth_difference);
}

if (r.warnings.length) {
  console.log('');
  for (const w of r.warnings) console.log(`  ! ${w}`);
}
console.log('');
