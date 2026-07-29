import { applyMinimumTax } from './minimumTax';
import { round2 } from './money';
import { computeRebate } from './rebate';
import { taxOnSlabs } from './slabs';
import type { Breakdown, TaxInputs, YearConfig } from './types';

export * from './types';
export { loadYearConfig, listYears } from './config';
export { bdt, round2 } from './money';

/**
 * Compute tax for one assessment year.
 *
 * Deliberately has NO dependency on the LLM layer — pull the AI out of this
 * project entirely and tax computation still works. That is the test of
 * whether the layering is right.
 */
export function computeTax(config: YearConfig, inputs: TaxInputs): Breakdown {
  const warnings: string[] = [];
  if (!config.verified) {
    warnings.push(
      `Rule figures for AY ${config.assessment_year} are UNVERIFIED (source: ${config.source}).`,
    );
  }

  // --- Salary ---------------------------------------------------------------
  const s = inputs.salary;
  const grossSalary = round2(
    s.basic +
      s.house_rent_allowance +
      s.medical_allowance +
      s.conveyance_allowance +
      s.bonus +
      s.other_allowances +
      s.non_cash_benefits,
  );

  const salaryExemption = computeSalaryExemption(config, inputs, warnings);
  const taxableSalary = round2(Math.max(0, grossSalary - salaryExemption));

  // --- Total income ---------------------------------------------------------
  if (config.house_property.repair_allowance_pct === null && inputs.house_property_income > 0) {
    warnings.push(
      'House property income is taken as NET — no repair-allowance rule is configured for this year.',
    );
  }

  const totalIncome = round2(
    taxableSalary + inputs.house_property_income + inputs.bank_interest + inputs.other_income,
  );

  // --- Threshold ------------------------------------------------------------
  const baseThreshold = config.exempt_threshold[inputs.category];
  const exemptThreshold = round2(
    baseThreshold + (inputs.is_parent_of_disabled ? config.parent_of_disabled_extra : 0),
  );

  const taxableAboveThreshold = round2(Math.max(0, totalIncome - exemptThreshold));

  // --- Slabs ----------------------------------------------------------------
  const { total: grossTax, rows: bandRows } = taxOnSlabs(config.bands, taxableAboveThreshold);

  // --- Rebate ---------------------------------------------------------------
  const { amount: rebate, binding: rebateBinding } = computeRebate(
    config,
    totalIncome,
    inputs.eligible_investment,
  );
  const taxAfterRebate = round2(Math.max(0, grossTax - rebate));

  // --- Minimum tax ----------------------------------------------------------
  const { net: netTax, applied: minimumApplied } = applyMinimumTax(
    config,
    taxAfterRebate,
    totalIncome,
    exemptThreshold,
    inputs.is_first_time_filer,
  );

  // --- Settlement -----------------------------------------------------------
  const paid = round2(inputs.source_tax + inputs.advance_tax);
  const balance = round2(netTax - paid);

  return {
    assessment_year: config.assessment_year,
    config_verified: config.verified,

    gross_salary: grossSalary,
    salary_exemption: salaryExemption,
    taxable_salary: taxableSalary,

    house_property_income: round2(inputs.house_property_income),
    bank_interest: round2(inputs.bank_interest),
    other_income: round2(inputs.other_income),
    total_income: totalIncome,

    exempt_threshold: exemptThreshold,
    taxable_above_threshold: taxableAboveThreshold,

    band_rows: bandRows,
    gross_tax: grossTax,

    rebate,
    rebate_binding: rebateBinding,

    tax_after_rebate: taxAfterRebate,
    minimum_tax_applied: minimumApplied,
    net_tax: round2(netTax),

    source_tax: round2(inputs.source_tax),
    advance_tax: round2(inputs.advance_tax),
    payable: balance > 0 ? balance : 0,
    refundable: balance < 0 ? round2(-balance) : 0,

    warnings,
  };
}

/**
 * Salary exemption.
 *
 * Two modes because the rule is unconfirmed (open item V4): itemised HRA +
 * medical caps, or a single overall cap. The replay eval decides which is real.
 */
function computeSalaryExemption(
  config: YearConfig,
  inputs: TaxInputs,
  warnings: string[],
): number {
  const s = inputs.salary;
  const ex = config.salary_exemption;

  if (ex.mode === 'overall_cap') {
    if (ex.overall_cap === null) {
      warnings.push('salary_exemption.mode is "overall_cap" but no overall_cap is set — treating exemption as 0.');
      return 0;
    }
    const exemptibleAllowances = round2(
      s.house_rent_allowance + s.medical_allowance + s.conveyance_allowance,
    );
    return round2(Math.min(exemptibleAllowances, ex.overall_cap));
  }

  // itemized
  const houseRent =
    ex.house_rent_pct_of_basic === null
      ? 0
      : Math.min(s.house_rent_allowance, round2(s.basic * ex.house_rent_pct_of_basic));

  const medical =
    ex.medical_annual_cap === null
      ? 0
      : Math.min(s.medical_allowance, ex.medical_annual_cap);

  const conveyance =
    ex.conveyance_annual_cap === null
      ? 0
      : Math.min(s.conveyance_allowance, ex.conveyance_annual_cap);

  if (ex.conveyance_annual_cap === null && s.conveyance_allowance > 0) {
    warnings.push(
      'Conveyance allowance received but no exemption cap is configured — treated as fully taxable.',
    );
  }

  return round2(houseRent + medical + conveyance);
}
