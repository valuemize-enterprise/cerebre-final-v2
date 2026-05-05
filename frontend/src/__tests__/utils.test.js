/**
 * Frontend utility tests — pure functions only, no DOM/React needed.
 * Run: node src/__tests__/utils.test.js
 */

const assert = require('node:assert/strict');

// ── formatters (inline — same logic as components use) ────────
const formatValue = (v) => {
  const n = Number(v);
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return n.toLocaleString();
};

const calcDelta = (current, previous) => {
  if (!previous || previous === 0) return current > 0 ? 100 : 0;
  return parseFloat(((current - previous) / previous * 100).toFixed(2));
};

// ── Tests ─────────────────────────────────────────────────────
let passed = 0, failed = 0;
const ok = (label, fn) => {
  try { fn(); console.log(`  ✓ ${label}`); passed++; }
  catch(e) { console.error(`  ✗ ${label}: ${e.message}`); failed++; }
};

console.log('\nformatValue');
ok('millions', () => assert.equal(formatValue(1500000), '1.5M'));
ok('thousands', () => assert.equal(formatValue(45000), '45k'));
ok('small numbers', () => assert.equal(formatValue(999), '999'));
ok('zero', () => assert.equal(formatValue(0), '0'));

console.log('\ncalcDelta');
ok('positive growth', () => assert.equal(calcDelta(120, 100), 20));
ok('negative growth', () => assert.equal(calcDelta(80, 100), -20));
ok('zero previous → 100% if positive', () => assert.equal(calcDelta(50, 0), 100));
ok('zero previous + zero current → 0', () => assert.equal(calcDelta(0, 0), 0));
ok('precise decimal', () => assert.equal(calcDelta(105, 100), 5));
ok('large values', () => assert.equal(calcDelta(1200000, 1000000), 20));

// ── Platform colour safety ────────────────────────────────────
const PLATFORM_COLORS = {
  instagram: '#E1306C', facebook: '#1877F2', twitter: '#1DA1F2',
  tiktok: '#69C9D0', youtube: '#FF0000', google_ads: '#4285F4',
  website: '#10B981', email: '#F59E0B', linkedin: '#0A66C2',
};

console.log('\nPlatform colours');
ok('all 9 platforms defined', () => assert.equal(Object.keys(PLATFORM_COLORS).length, 9));
ok('all are valid hex', () => {
  Object.values(PLATFORM_COLORS).forEach((c) => {
    assert.match(c, /^#[0-9A-Fa-f]{6}$/);
  });
});
ok('no duplicates', () => {
  const vals = Object.values(PLATFORM_COLORS);
  assert.equal(vals.length, new Set(vals).size);
});

// ── Date helpers ──────────────────────────────────────────────
const toMonthLabel = (dateStr) => {
  const d = new Date(dateStr);
  return d.toLocaleString('en-NG', { month: 'short', year: 'numeric' });
};

console.log('\nDate helpers');
ok('formats date string to label', () => {
  const label = toMonthLabel('2025-03-01');
  assert.ok(label.includes('2025'));
  assert.ok(label.includes('Mar'));
});

// ── Summary ───────────────────────────────────────────────────
const summary = `\n${passed + failed} tests: ${passed} passed, ${failed} failed`;
console.log(summary);
if (failed > 0) process.exit(1);

// ── File validators ───────────────────────────────────────────
// Inline the logic (same as validators.ts)
const MAX_FILE_SIZE_MB = 50;
const ALLOWED_TYPES = new Set(['application/pdf','image/png','image/jpeg','image/jpg','image/webp']);
const validateFile = (file) => {
  const errors = [], warnings = [];
  if (!ALLOWED_TYPES.has(file.type)) {
    const ext = '.' + (file.name.split('.').pop() || '').toLowerCase();
    if (!new Set(['.pdf','.png','.jpg','.jpeg','.webp']).has(ext))
      errors.push(`"${file.name}" is not supported`);
  }
  const sizeMB = file.size / (1024 * 1024);
  if (sizeMB > MAX_FILE_SIZE_MB) errors.push(`"${file.name}" too large`);
  if (file.size < 10 * 1024) warnings.push(`"${file.name}" very small`);
  return { valid: errors.length === 0, errors, warnings };
};

const validateFiles = (files) => {
  const errors = [], warnings = [];
  if (files.length === 0) { errors.push('No files'); return { valid: false, errors, warnings }; }
  if (files.length > 10) errors.push('Too many files');
  const seen = new Map();
  files.forEach(f => {
    const key = `${f.name}:${f.size}`;
    if (seen.has(key)) warnings.push(`"${f.name}" duplicate`);
    seen.set(key, true);
    const r = validateFile(f);
    errors.push(...r.errors); warnings.push(...r.warnings);
  });
  return { valid: errors.length === 0, errors, warnings };
};

const formatFileSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024*1024) return `${(bytes/1024).toFixed(0)} KB`;
  return `${(bytes/(1024*1024)).toFixed(1)} MB`;
};

const makeFile = (name, type, sizeKb) => ({ name, type, size: sizeKb * 1024 });

console.log('\nFile validators');
ok('valid PDF accepted', () => {
  const r = validateFile(makeFile('report.pdf', 'application/pdf', 500));
  assert.equal(r.valid, true);
  assert.equal(r.errors.length, 0);
});
ok('invalid type rejected', () => {
  const r = validateFile(makeFile('report.exe', 'application/exe', 100));
  assert.equal(r.valid, false);
  assert.ok(r.errors.length > 0);
});
ok('oversized file rejected', () => {
  const r = validateFile(makeFile('huge.pdf', 'application/pdf', 51 * 1024));
  assert.equal(r.valid, false);
});
ok('small file gets warning', () => {
  const r = validateFile(makeFile('tiny.png', 'image/png', 5));
  assert.equal(r.valid, true);
  assert.ok(r.warnings.length > 0);
});
ok('empty batch rejected', () => {
  const r = validateFiles([]);
  assert.equal(r.valid, false);
});
ok('too many files rejected', () => {
  const files = Array.from({length: 11}, (_, i) => makeFile(`f${i}.pdf`, 'application/pdf', 100));
  const r = validateFiles(files);
  assert.equal(r.valid, false);
});
ok('duplicate detected as warning', () => {
  const f = makeFile('report.pdf', 'application/pdf', 200);
  const r = validateFiles([f, f]);
  assert.ok(r.warnings.some(w => w.includes('duplicate')));
});

console.log('\nformatFileSize');
ok('bytes', () => assert.equal(formatFileSize(512), '512 B'));
ok('kilobytes', () => assert.equal(formatFileSize(2048), '2 KB'));
ok('megabytes', () => assert.equal(formatFileSize(5 * 1024 * 1024), '5.0 MB'));
