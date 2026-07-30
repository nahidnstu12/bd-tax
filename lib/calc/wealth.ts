import { totalLifestyleExpenditure } from './expenditure';
import { roundTaka } from './money';
import type { NormalizedTaxInputs, WealthReconciliation } from './types';

/**
 * Sources-of-fund vs lifestyle/outflows (Assets tab simplified).
 * Does not model asset line items — only income + prior wealth vs expenditure.
 */
export function computeWealthReconciliation(
  inputs: NormalizedTaxInputs,
  grossSalary: number,
  totalIncome: number,
  salaryExemption: number,
): WealthReconciliation {
  const w = inputs.wealth;
  const lifestyleTotal = totalLifestyleExpenditure(inputs.expenditure);

  // Tax-exempt salary is still a source of fund on IT-10B / wealth reconcile.
  const incomeSources = roundTaka(totalIncome + salaryExemption);
  const otherSources = roundTaka(w.other_sources);
  const prior = roundTaka(w.prior_net_wealth);

  const totalSources = roundTaka(incomeSources + otherSources + prior);
  const otherOut = roundTaka(w.other_outflows);
  const totalOutflows = roundTaka(lifestyleTotal + otherOut);

  const closingNetWealth = roundTaka(totalSources - totalOutflows);

  const declared = w.declared_closing_net_wealth;
  const wealthDifference =
    declared != null ? roundTaka(declared - closingNetWealth) : roundTaka(0);

  return {
    gross_salary_for_wealth: roundTaka(grossSalary),
    income_sources: incomeSources,
    other_sources: otherSources,
    prior_net_wealth: prior,
    total_sources: totalSources,
    lifestyle_expense_total: lifestyleTotal,
    other_outflows: otherOut,
    total_outflows: totalOutflows,
    closing_net_wealth: closingNetWealth,
    declared_closing_net_wealth: declared ?? null,
    wealth_difference: wealthDifference,
  };
}
