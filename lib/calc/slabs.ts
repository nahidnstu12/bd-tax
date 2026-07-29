import { round2 } from './money';
import type { Band, BandRow } from './types';

/**
 * Apply the slab bands to income above the exempt threshold.
 *
 * Bands are widths applied in order; the final band may have `width: null`,
 * meaning "everything remaining". Returns per-band rows as well as the total,
 * so the UI can show the working and the LLM can narrate it without recomputing.
 */
export function taxOnSlabs(
  bands: Band[],
  taxableAboveThreshold: number,
): { total: number; rows: BandRow[] } {
  const rows: BandRow[] = [];
  let remaining = Math.max(0, taxableAboveThreshold);
  let total = 0;
  let lowerEdge = 0;

  for (const band of bands) {
    const width = band.width ?? Infinity;
    const amount = Math.min(remaining, width);
    const tax = round2(amount * band.rate);

    rows.push({
      band:
        band.width === null
          ? `above ${lowerEdge.toLocaleString('en-US')}`
          : `next ${band.width.toLocaleString('en-US')}`,
      width: band.width,
      rate: band.rate,
      amount_taxed: round2(amount),
      tax,
    });

    total = round2(total + tax);
    remaining = round2(remaining - amount);
    lowerEdge += band.width ?? 0;

    if (remaining <= 0) break;
  }

  return { total, rows };
}
