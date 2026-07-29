import type { YearConfig } from './types';

/**
 * Minimum tax acts as a floor on the tax due after rebate.
 *
 * NOTE (open item V2): sources disagree on the trigger. One says it is a floor
 * whenever computed tax falls below the amount; another says it applies to
 * anyone whose income exceeds the tax-free threshold. The `applies_when`
 * config field encodes the choice so the replay eval can settle it empirically
 * rather than us guessing.
 */
export function applyMinimumTax(
  config: YearConfig,
  taxAfterRebate: number,
  totalIncome: number,
  exemptThreshold: number,
  isFirstTimeFiler: boolean,
): { net: number; applied: boolean } {
  const floor = isFirstTimeFiler
    ? config.minimum_tax.first_time_filer
    : config.minimum_tax.standard;

  const triggered =
    config.minimum_tax.applies_when === 'always' || totalIncome > exemptThreshold;

  if (!triggered) return { net: taxAfterRebate, applied: false };

  return taxAfterRebate < floor
    ? { net: floor, applied: true }
    : { net: taxAfterRebate, applied: false };
}
