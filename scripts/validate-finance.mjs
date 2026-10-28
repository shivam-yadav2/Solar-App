import assert from 'node:assert/strict';

const round = (value) => Math.round(value * 100) / 100;
const monthlyEmi = (principal, annualRate, months) => {
  if (principal <= 0 || months <= 0) return 0;
  const rate = annualRate / 12 / 100;
  if (!rate) return principal / months;
  const growth = (1 + rate) ** months;
  return principal * rate * growth / (growth - 1);
};
const subsidy = (kw) => kw <= 0 ? 0 : kw <= 2 ? Math.round(30_000 * kw) : Math.round(Math.min(78_000, 60_000 + 18_000 * (kw - 2)));

// Approved business examples shared by web/mobile acceptance checks.
assert.equal(subsidy(1), 30_000);
assert.equal(subsidy(2), 60_000);
assert.equal(subsidy(3), 78_000);
assert.equal(subsidy(5), 78_000);
assert.equal(round(monthlyEmi(240_000 - 78_000, 7, 120)), 1880.96);

const invoiceTotal = 195_000;
const taxable = round(invoiceTotal * 100 / 105);
const gst = round(taxable * 5 / 100);
assert.equal(taxable, 185_714.29);
assert.equal(gst, 9_285.71);
const cgst = round(gst / 2), sgst = round(gst - cgst);
assert.equal(cgst, 4_642.85);
assert.equal(sgst, 4_642.86);
assert.equal(round(cgst + sgst), gst);
assert.equal(round(taxable + gst), invoiceTotal);

const gross = 30_000 + 5_000 + 2_000 + 3_000 + 1_000;
const deductions = 1_800 + 200 + 1_000 + 2_000 + 500;
assert.equal(gross, 41_000);
assert.equal(deductions, 5_500);
assert.equal(Math.max(0, gross - deductions), 35_500);

const contract = 285_000, procurement = 19_000, fieldCost = 3_500;
assert.equal(contract - procurement - fieldCost, 262_500);
assert.equal(round(((contract - procurement - fieldCost) / contract) * 100), 92.11);

console.log('Validated EMI, subsidy, GST, payroll, and profit golden calculations.');
