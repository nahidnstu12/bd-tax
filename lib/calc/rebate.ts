import { roundTaka } from './money';
import type { Breakdown, YearConfig } from './types';

/**
 * Investment tax rebate — the LOWEST of three caps applies.
 *
 * Also reports which cap actually bound. That is the genuinely useful bit for
 * the assistant: "you are capped by 3% of income, so investing more won't help"
 * is far more actionable than the number alone.
 */
export function computeRebate(
  config: YearConfig,
  totalIncome: number,
  eligibleInvestment: number,
): { amount: number; binding: Breakdown['rebate_binding'] } {
  if (eligibleInvestment <= 0) return { amount: 0, binding: 'none' };

  const byIncome = roundTaka(totalIncome * config.rebate.pct_of_taxable_income);
  const byInvestment = roundTaka(eligibleInvestment * config.rebate.pct_of_investment);
  const byCap = config.rebate.absolute_cap;

  const amount = Math.min(byIncome, byInvestment, byCap);

  const binding: Breakdown['rebate_binding'] =
    amount === byInvestment ? 'investment' : amount === byIncome ? 'income' : 'cap';

  return { amount: roundTaka(amount), binding };
}
