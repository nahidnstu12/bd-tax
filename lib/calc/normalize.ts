import { mergeLifestyle } from './expenditure';
import type { LifestyleExpenditure, TaxInputs, WealthInputs } from './types';

const EMPTY_WEALTH: WealthInputs = {
  prior_net_wealth: 0,
  other_sources: 0,
  other_outflows: 0,
  declared_closing_net_wealth: null,
};

export interface NormalizedTaxInputs extends Omit<TaxInputs, 'expenditure' | 'wealth'> {
  expenditure: LifestyleExpenditure;
  wealth: WealthInputs;
}

/** Fill missing expenditure / wealth so older JSON fixtures keep working. */
export function normalizeTaxInputs(raw: TaxInputs): NormalizedTaxInputs {
  return {
    ...raw,
    expenditure: mergeLifestyle(raw.expenditure),
    wealth: { ...EMPTY_WEALTH, ...raw.wealth },
  };
}
