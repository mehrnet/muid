import test from 'node:test';
import assert from 'node:assert/strict';

const EPOCH = 1790022600n; // 2026-09-22 00:00:00 UTC+3:30 (2026-09-21 20:30:00 UTC)
const BASE62_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

function encodeBase36(num) {
  if (num === 0n) return '0';
  const chars = '0123456789abcdefghijklmnopqrstuvwxyz';
  let res = '';
  let n = num;
  while (n > 0n) {
    res = chars[Number(n % 36n)] + res;
    n /= 36n;
  }
  return res;
}

function parseBase36(str) {
  const clean = String(str).trim().toLowerCase();
  if (!clean || !/^[0-9a-z]+$/.test(clean)) {
    throw new Error('Invalid base36 string');
  }
  let res = 0n;
  for (const ch of clean) {
    const code = ch.charCodeAt(0);
    const val = code >= 48 && code <= 57 ? BigInt(code - 48) : BigInt(code - 87);
    res = res * 36n + val;
  }
  return res;
}

function parseMuid(input) {
  let raw;
  if (typeof input === 'bigint') {
    raw = input;
  } else if (typeof input === 'number') {
    raw = BigInt(input);
  } else {
    const str = String(input).trim();
    // If it's pure decimal digits with length >= 10, check if treated as raw or base36
    // In MUID specification, user-facing IDs are base36
    raw = parseBase36(str);
  }
  const randomSuffix = raw % 10000n;
  const elapsed = raw / 10000n;
  const timestamp = EPOCH + elapsed;
  const base36 = encodeBase36(raw);
  return {
    raw,
    base36,
    elapsed,
    randomSuffix: Number(randomSuffix),
    timestamp,
    dateUtc: new Date(Number(timestamp) * 1000).toISOString()
  };
}

function generateMuid(timestampSec = Math.floor(Date.now() / 1000), randomDigits) {
  const elapsed = BigInt(timestampSec) - EPOCH;
  if (elapsed < 0n) {
    throw new Error('Timestamp cannot be earlier than MUID epoch (2026-09-22 00:00:00 UTC+3:30)');
  }
  const rand = randomDigits !== undefined ? BigInt(randomDigits) : BigInt(Math.floor(Math.random() * 10000));
  if (rand < 0n || rand > 9999n) throw new Error('Random suffix must be 0-9999');
  const raw = elapsed * 10000n + rand;
  return {
    raw,
    base36: encodeBase36(raw),
    elapsed,
    randomSuffix: Number(rand)
  };
}

function encodeBase62(num) {
  if (num === 0n) return BASE62_ALPHABET[0];
  let res = '';
  let n = num;
  while (n > 0n) {
    res = BASE62_ALPHABET[Number(n % 62n)] + res;
    n /= 62n;
  }
  return res;
}

function decodeBase62(str) {
  const clean = String(str).trim();
  let res = 0n;
  for (const ch of clean) {
    const idx = BASE62_ALPHABET.indexOf(ch);
    if (idx === -1) throw new Error(`Invalid base62 character: ${ch}`);
    res = res * 62n + BigInt(idx);
  }
  return res;
}

function generateSecret() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let num = 0n;
  for (const b of bytes) {
    num = (num << 8n) | BigInt(b);
  }
  return encodeBase62(num);
}

function parseAccountToken(token) {
  const parts = String(token).trim().split(':');
  if (parts.length !== 2) {
    throw new Error('Invalid account token format: expected <accountId>:<accountSecret>');
  }
  const [accountId, accountSecret] = parts;
  const decodedMuid = parseMuid(accountId);
  if (!accountSecret || !/^[0-9A-Za-z]{40,45}$/.test(accountSecret)) {
    throw new Error('Invalid account secret format: expected 256-bit base62 string');
  }
  return {
    accountId: decodedMuid.base36,
    accountSecret,
    muid: decodedMuid
  };
}

test('Specification Vector 1: Raw Numeric ID 13954201234 -> Base36 6eryyky', () => {
  const raw = 13954201234n;
  const b36 = encodeBase36(raw);
  assert.equal(b36, '6eryyky');

  const parsed = parseMuid('6eryyky');
  assert.equal(parsed.raw, 13954201234n);
  assert.equal(parsed.elapsed, 1395420n);
  assert.equal(parsed.randomSuffix, 1234);
});

test('Specification Vector 2: Account ID 6gq46u -> Raw Numeric 390889398', () => {
  const parsed = parseMuid('6gq46u');
  assert.equal(parsed.raw, 390889398n);
  assert.equal(parsed.elapsed, 39088n);
  assert.equal(parsed.randomSuffix, 9398);
  assert.equal(parsed.base36, '6gq46u');
});

test('Case-insensitivity of Base36 Account IDs', () => {
  const lower = parseMuid('6gq46u');
  const upper = parseMuid('6GQ46U');
  const mixed = parseMuid('6Gq46U');
  assert.equal(lower.raw, upper.raw);
  assert.equal(lower.raw, mixed.raw);
  assert.equal(upper.base36, '6gq46u');
});

test('Secret hash generation & Base62 validation', () => {
  for (let i = 0; i < 50; i++) {
    const sec = generateSecret();
    assert.ok(sec.length >= 42 && sec.length <= 43, `Length ${sec.length} out of bounds`);
    assert.ok(/^[0-9A-Za-z]+$/.test(sec), 'Contains invalid characters');
    const num = decodeBase62(sec);
    assert.ok(num > 0n);
    assert.ok(num < (1n << 256n), 'Exceeds 256 bits');
  }
});

test('Provided Secret Examples decode properly', () => {
  const ex1 = '1Xy7K9pQ2LmN4zBt8vXw3zR7kM6bC5dA4e3f2g1h0iJ';
  const ex2 = '5nB8mQ1rW4tY7uI0oP3aS6dF9gH2jK5lZ8xC1vB4nM';

  const n1 = decodeBase62(ex1);
  const n2 = decodeBase62(ex2);

  assert.ok(n1 < (1n << 256n));
  assert.ok(n2 < (1n << 256n));
  assert.equal(encodeBase62(n1), ex1);
  assert.equal(encodeBase62(n2), ex2);
});

test('Account Token parsing and validation', () => {
  const token = '6gq46u:1Xy7K9pQ2LmN4zBt8vXw3zR7kM6bC5dA4e3f2g1h0iJ';
  const res = parseAccountToken(token);
  assert.equal(res.accountId, '6gq46u');
  assert.equal(res.accountSecret, '1Xy7K9pQ2LmN4zBt8vXw3zR7kM6bC5dA4e3f2g1h0iJ');
  assert.equal(res.muid.raw, 390889398n);
  assert.equal(res.muid.randomSuffix, 9398);
});

test('MUID Generation from epoch timestamp', () => {
  const muid = generateMuid(Number(EPOCH) + 1395420, 1234);
  assert.equal(muid.raw, 13954201234n);
  assert.equal(muid.base36, '6eryyky');
});

test('API Regex Validator: ^[0-9a-z]{6,12}:[0-9a-zA-Z]{43}$', () => {
  const API_TOKEN_REGEX = /^[0-9a-z]{6,12}:[0-9a-zA-Z]{43}$/;
  const validToken = '6gq46u:1Xy7K9pQ2LmN4zBt8vXw3zR7kM6bC5dA4e3f2g1h0iJ';
  assert.ok(API_TOKEN_REGEX.test(validToken), 'Sample token must match regex');

  const validToken2 = '6eryyky:1Xy7K9pQ2LmN4zBt8vXw3zR7kM6bC5dA4e3f2g1h0iJ';
  assert.ok(API_TOKEN_REGEX.test(validToken2), 'Vector 2 token must match regex');

  // Negative tests
  assert.equal(API_TOKEN_REGEX.test('short:1Xy7K9pQ2LmN4zBt8vXw3zR7kM6bC5dA4e3f2g1h0iJ'), false); // ID < 6 chars
  assert.equal(API_TOKEN_REGEX.test('6gq46u:short_secret'), false); // Secret != 43 chars
  assert.equal(API_TOKEN_REGEX.test('6GQ46U:1Xy7K9pQ2LmN4zBt8vXw3zR7kM6bC5dA4e3f2g1h0iJ'), false); // ID must be normalized lowercase
});

test('Self-contained syntax highlighter highlights keywords, strings, comments and numbers', async () => {
  const { highlightCode } = await import('../app.js');
  const code = `// comment\nconst a = "hello <world>";\nreturn 12345;\n`;
  const highlighted = highlightCode(code);

  assert.ok(highlighted.includes('<span class="tok-comment">// comment</span>'));
  assert.ok(highlighted.includes('<span class="tok-keyword">const</span>'));
  assert.ok(highlighted.includes('<span class="tok-string">&quot;hello &lt;world&gt;&quot;</span>'));
  assert.ok(highlighted.includes('<span class="tok-keyword">return</span>'));
  assert.ok(highlighted.includes('<span class="tok-number">12345</span>'));
});

test('Code blocks format line numbers with code-line wrappers', async () => {
  const { highlightCodeWithLineNumbers } = await import('../app.js');
  const code = `package muid\nfunc Hello() {\n  return 42\n}`;
  const html = highlightCodeWithLineNumbers(code);

  assert.ok(html.includes('<span class="code-line"><span class="line-num">1</span>'));
  assert.ok(html.includes('<span class="code-line"><span class="line-num">2</span>'));
  assert.ok(html.includes('<span class="code-line"><span class="line-num">3</span>'));
  assert.ok(html.includes('<span class="tok-keyword">package</span>'));
  assert.ok(html.includes('<span class="tok-number">42</span>'));
});



