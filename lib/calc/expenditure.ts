import { roundTaka } from './money';
import type { LifestyleExpenditure } from './types';

/** NBR Expenditure tab — Statement of Expenses Relating to Lifestyle (+ tax lines). */
export const EMPTY_LIFESTYLE: LifestyleExpenditure = {
  food_clothing_essentials: 0,
  accommodation: 0,
  auto_transport: 0,
  household_utility: 0,
  education: 0,
  travel_vacation: 0,
  festival_special: 0,
  other_lifestyle: 0,
  tax_charges_paid: 0,
  personal_loan_interest: 0,
  environmental_surcharge: 0,
};

export function totalLifestyleExpenditure(e: LifestyleExpenditure): number {
  return roundTaka(
    e.food_clothing_essentials +
      e.accommodation +
      e.auto_transport +
      e.household_utility +
      e.education +
      e.travel_vacation +
      e.festival_special +
      e.other_lifestyle +
      e.tax_charges_paid +
      e.personal_loan_interest +
      e.environmental_surcharge,
  );
}

export function mergeLifestyle(partial?: Partial<LifestyleExpenditure>): LifestyleExpenditure {
  return { ...EMPTY_LIFESTYLE, ...partial };
}
