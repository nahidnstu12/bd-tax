/** Round to 2 decimals, avoiding the usual float artefacts. */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Whole taka (NBR form lines). One filed return suggests round-to-nearest, not truncate. */
export function roundTaka(n: number): number {
  return Math.round(n + Number.EPSILON);
}

/** Format for display, e.g. 141300 -> "1,41,300" (BD lakh grouping). */
export function bdt(n: number): string {
  const fixed = round2(n).toFixed(2).replace(/\.00$/, '');
  const [whole = '0', frac] = fixed.split('.');
  const sign = whole.startsWith('-') ? '-' : '';
  const digits = whole.replace('-', '');

  // Last 3 digits, then groups of 2.
  const last3 = digits.slice(-3);
  const rest = digits.slice(0, -3);
  const grouped = rest ? `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${last3}` : last3;

  return sign + grouped + (frac ? `.${frac}` : '');
}
