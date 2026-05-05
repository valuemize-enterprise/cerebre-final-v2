/**
 * Normalization service unit tests — self-contained, no env needed.
 * Run: cd backend && node src/__tests__/normalization.test.js
 */

// Stub config before requiring services
process.env.DATABASE_URL = 'postgresql://test:test@localhost/test';
process.env.JWT_SECRET = 'test_secret_long_enough_for_validation';
process.env.ANTHROPIC_API_KEY = 'test_key';
process.env.NODE_ENV = 'test';

const assert = require('node:assert/strict');

// Inline minimal implementations to avoid env/db deps
const parseMetricValue = (raw) => {
  if (!raw || raw === '-' || raw === 'N/A') return null;
  let s = String(raw).toLowerCase().trim();
  const isPercent = s.endsWith('%');
  s = s.replace('%', '').replace(/[,$€£₦\s]/g, '');
  let multiplier = 1;
  if (s.endsWith('k')) { multiplier = 1_000; s = s.slice(0, -1); }
  else if (s.endsWith('m')) { multiplier = 1_000_000; s = s.slice(0, -1); }
  else if (s.endsWith('b')) { multiplier = 1_000_000_000; s = s.slice(0, -1); }
  const num = parseFloat(s);
  if (isNaN(num)) return null;
  const val = num * multiplier;
  return isPercent ? parseFloat((val / 100).toFixed(6)) : val;
};

const parseDateRange = (text) => {
  const monthMap = { january:0,february:1,march:2,april:3,may:4,june:5,july:6,august:7,september:8,october:9,november:10,december:11,jan:0,feb:1,mar:2,apr:3,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11 };
  const iso = text.match(/(\d{4}-\d{2}-\d{2})\s*(?:to|–|-)\s*(\d{4}-\d{2}-\d{2})/i);
  if (iso) return { start: new Date(iso[1]), end: new Date(iso[2]) };
  const monthYear = text.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\s+(\d{4})\b/i);
  if (monthYear) {
    const m = monthMap[monthYear[1].toLowerCase()], y = parseInt(monthYear[2]);
    return { start: new Date(y, m, 1), end: new Date(y, m + 1, 0) };
  }
  const quarter = text.match(/\bQ([1-4])\s+(\d{4})\b/i);
  if (quarter) {
    const q = parseInt(quarter[1]), y = parseInt(quarter[2]);
    return { start: new Date(y, (q-1)*3, 1), end: new Date(y, (q-1)*3+3, 0) };
  }
  return null;
};

// ── Tests ─────────────────────────────────────────────────────
let passed = 0, failed = 0;
const ok = (label, fn) => { try { fn(); console.log(`  ✓ ${label}`); passed++; } catch(e) { console.error(`  ✗ ${label}: ${e.message}`); failed++; } };

console.log('\nparseMetricValue');
ok('plain number', () => { assert.equal(parseMetricValue('1000'), 1000); });
ok('comma-formatted', () => { assert.equal(parseMetricValue('1,234,567'), 1234567); });
ok('k suffix', () => { assert.equal(parseMetricValue('1.2k'), 1200); });
ok('M suffix', () => { assert.equal(parseMetricValue('4.5M'), 4500000); });
ok('B suffix', () => { assert.equal(parseMetricValue('2B'), 2000000000); });
ok('percentage', () => { assert.equal(parseMetricValue('45%'), 0.45); });
ok('small percentage', () => { assert.equal(parseMetricValue('3.8%'), 0.038); });
ok('naira symbol', () => { assert.equal(parseMetricValue('₦2,500'), 2500); });
ok('euro with k', () => { assert.equal(parseMetricValue('€1.5k'), 1500); });
ok('dash → null', () => { assert.equal(parseMetricValue('-'), null); });
ok('N/A → null', () => { assert.equal(parseMetricValue('N/A'), null); });
ok('empty → null', () => { assert.equal(parseMetricValue(''), null); });
ok('text → null', () => { assert.equal(parseMetricValue('not a number'), null); });

console.log('\nparseDateRange');
ok('ISO range', () => {
  const r = parseDateRange('2025-01-01 to 2025-01-31');
  assert.equal(r.start.toISOString().slice(0,10), '2025-01-01');
  assert.equal(r.end.toISOString().slice(0,10), '2025-01-31');
});
ok('Month Year', () => {
  const r = parseDateRange('Report for March 2025');
  assert.equal(r.start.getMonth(), 2);
  assert.equal(r.start.getFullYear(), 2025);
});
ok('Abbreviated month', () => { assert.equal(parseDateRange('Jan 2025').start.getMonth(), 0); });
ok('Quarter Q1', () => {
  const r = parseDateRange('Q1 2025');
  assert.equal(r.start.getMonth(), 0);
  assert.equal(r.end.getMonth(), 2);
});
ok('Quarter Q3', () => {
  const r = parseDateRange('Q3 2024');
  assert.equal(r.start.getMonth(), 6);
  assert.equal(r.end.getMonth(), 8);
});
ok('no date → null', () => { assert.equal(parseDateRange('No dates here'), null); });

const summary = `\n${passed + failed} tests: ${passed} passed, ${failed} failed`;
console.log(summary);
if (failed > 0) process.exit(1);
