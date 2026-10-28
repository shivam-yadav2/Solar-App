/** Standard reducing-balance EMI shared with the SolarOS web application. */
export function monthlyEmi(principal: number, annualRatePercent: number, months: number): number {
  if (principal <= 0 || months <= 0) return 0;
  const rate = annualRatePercent / 12 / 100;
  if (rate === 0) return principal / months;
  const growth = (1 + rate) ** months;
  return (principal * rate * growth) / (growth - 1);
}

/** PM Surya Ghar central subsidy used by the web calculator. */
export function pmSuryaGharSubsidy(kw: number): number {
  if (!(kw > 0)) return 0;
  if (kw <= 2) return Math.round(30_000 * kw);
  return Math.round(Math.min(78_000, 60_000 + 18_000 * (kw - 2)));
}
