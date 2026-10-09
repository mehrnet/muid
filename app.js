/**
 * MUID — Mehr Unique ID Specification & Interactive Tools
 * Copyright (c) 2026 Mehrnet (https://mehrnet.com)
 */

const EPOCH_SEC = 1790022600n; // 2026-09-22T00:00:00+03:30 (2026-09-21T20:30:00Z)
const BASE36_CHARS = '0123456789abcdefghijklmnopqrstuvwxyz';
const BASE62_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

/* =============================================
   MUID ENGINE
   ============================================= */

export function encodeBase36(num) {
  let n = typeof num === 'bigint' ? num : BigInt(num);
  if (n === 0n) return '0';
  let res = '';
  while (n > 0n) {
    res = BASE36_CHARS[Number(n % 36n)] + res;
    n /= 36n;
  }
  return res;
}

export function parseBase36(str) {
  const clean = String(str).trim().toLowerCase();
  if (!clean || !/^[0-9a-z]+$/.test(clean)) {
    throw new Error('Invalid base36 format: allowed characters are 0-9 and a-z');
  }
  let res = 0n;
  for (const ch of clean) {
    const code = ch.charCodeAt(0);
    const val = code >= 48 && code <= 57 ? BigInt(code - 48) : BigInt(code - 87);
    res = res * 36n + val;
  }
  return res;
}

export function generateMuid(timestampSec = Math.floor(Date.now() / 1000), randomSuffix = null) {
  const elapsed = BigInt(timestampSec) - EPOCH_SEC;
  if (elapsed < 0n) {
    throw new Error('Current time is before MUID epoch (2026-09-22 00:00:00 UTC+3:30)');
  }
  let rand;
  if (randomSuffix !== null && randomSuffix !== undefined) {
    rand = BigInt(randomSuffix);
  } else {
    // Cryptographically secure 4-digit random number [0, 9999]
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    rand = BigInt(buf[0] % 10000);
  }
  if (rand < 0n || rand > 9999n) {
    throw new Error('Random digits must be between 0 and 9999');
  }
  const raw = elapsed * 10000n + rand;
  const base36 = encodeBase36(raw);
  const dateUtc = new Date(Number(EPOCH_SEC + elapsed) * 1000);

  return {
    raw,
    base36,
    elapsed,
    randomSuffix: Number(rand),
    timestamp: EPOCH_SEC + elapsed,
    dateUtc
  };
}

export function parseMuid(input) {
  let raw;
  const str = String(input).trim();
  if (!str) {
    throw new Error('Empty identifier provided');
  }

  // If user provided a numeric string and explicitly flagged or purely decimal with len >= 10
  if (/^\d{10,18}$/.test(str)) {
    raw = BigInt(str);
  } else {
    raw = parseBase36(str);
  }

  const randomSuffix = raw % 10000n;
  const elapsed = raw / 10000n;
  const timestamp = EPOCH_SEC + elapsed;
  const base36 = encodeBase36(raw);
  const dateUtc = new Date(Number(timestamp) * 1000);

  return {
    raw,
    base36,
    elapsed,
    randomSuffix: Number(randomSuffix),
    timestamp,
    dateUtc
  };
}

export function encodeBase62(num) {
  let n = typeof num === 'bigint' ? num : BigInt(num);
  if (n === 0n) return BASE62_CHARS[0];
  let res = '';
  while (n > 0n) {
    res = BASE62_CHARS[Number(n % 62n)] + res;
    n /= 62n;
  }
  return res;
}

export function decodeBase62(str) {
  const clean = String(str).trim();
  if (!clean || !/^[0-9A-Za-z]+$/.test(clean)) {
    throw new Error('Invalid base62 characters');
  }
  let res = 0n;
  for (const ch of clean) {
    const idx = BASE62_CHARS.indexOf(ch);
    if (idx === -1) throw new Error(`Invalid character: ${ch}`);
    res = res * 62n + BigInt(idx);
  }
  return res;
}

export function generateSecret() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let num = 0n;
  for (const b of bytes) {
    num = (num << 8n) | BigInt(b);
  }
  return encodeBase62(num);
}

export function parseAccountToken(token) {
  const clean = String(token).trim();
  const sepIdx = clean.indexOf(':');
  if (sepIdx === -1) {
    throw new Error('Missing colon separator. Expected format: "<account id>:<account secret>"');
  }
  const idPart = clean.slice(0, sepIdx);
  const secretPart = clean.slice(sepIdx + 1);

  const muid = parseMuid(idPart);
  if (!secretPart || !/^[0-9A-Za-z]{40,46}$/.test(secretPart)) {
    throw new Error('Invalid secret hash: must be 42-43 base62 characters');
  }

  return {
    accountId: muid.base36,
    accountSecret: secretPart,
    muid
  };
}

/* =============================================
   FORMATTING HELPERS
   ============================================= */

function formatDates(date) {
  const utcStr = date.toISOString().replace('T', ' ').replace('.000Z', ' UTC');
  
  // Format Tehran time (+03:30)
  const tehranMs = date.getTime() + (3.5 * 3600 * 1000);
  const tDate = new Date(tehranMs);
  const tYear = tDate.getUTCFullYear();
  const tMonth = String(tDate.getUTCMonth() + 1).padStart(2, '0');
  const tDay = String(tDate.getUTCDate()).padStart(2, '0');
  const tHour = String(tDate.getUTCHours()).padStart(2, '0');
  const tMin = String(tDate.getUTCMinutes()).padStart(2, '0');
  const tSec = String(tDate.getUTCSeconds()).padStart(2, '0');
  const tehranStr = `${tYear}-${tMonth}-${tDay} ${tHour}:${tMin}:${tSec} (+03:30)`;

  return { utcStr, tehranStr };
}

/* =============================================
   I18N TRANSLATIONS
   ============================================= */

const TRANSLATIONS = {
  en: {
    "nav.overview": "Overview",
    "nav.tools": "Interactive Tools",
    "nav.spec": "Specification",
    "nav.code": "Code Examples",
    "nav.faq": "FAQ",
    "pref.theme": "Theme",
    "pref.language": "Language",
    "hero.badge": "Official Specification",
    "hero.title": "Mehr Unique ID (MUID)",
    "hero.lead": "Time-ordered 64-bit integer identifiers with compact case-insensitive Base36 representation and 256-bit cryptographic account secrets for the Mehrnet ecosystem.",
    "hero.btn_playground": "Try Generator",
    "hero.btn_spec": "Read Specification",
    "feat.bigint_title": "64-bit Database Native",
    "feat.bigint_desc": "Stored as a single 8-byte signed or unsigned BIGINT in PostgreSQL, MySQL, SQLite, and ClickHouse for zero storage overhead.",
    "feat.b36_title": "Compact Base36 Encoding",
    "feat.b36_desc": "Canonical 6 to 7 character alphanumeric format (case-insensitive) for clean URLs, APIs, SMS, and friction-free user typing.",
    "feat.time_title": "K-Sortable & Time-Clustered",
    "feat.time_desc": "Chronologically ascending by design. Guarantees monotonic B-tree index insertion, eliminates fragmentation, and enables instant range scans.",
    "feat.epoch_title": "Fixed Tehran Epoch",
    "feat.epoch_desc": "Epoch set to 2026-09-22 00:00:00 (UTC+3:30). Keeps numbers delightfully small and compact for decades to come.",
    "feat.collision_title": "10,000 IDs / Second",
    "feat.collision_desc": "4-digit random decimal suffix (0000–9999) delivers resilient high-concurrency collision resistance per second.",
    "feat.secret_title": "256-Bit Base62 Security",
    "feat.secret_desc": "High-entropy 32-byte cryptographic secret hash for bearer authentication, webhook signing, and account tokens.",
    "tools.tab_muid": "MUID Generator & Decoder",
    "tools.tab_secret": "256-bit Secret Hash",
    "tools.tab_token": "Account Token Builder",
    "copied": "Copied to clipboard!"
  },
  fa: {
    "nav.overview": "بررسی اجمالی",
    "nav.tools": "ابزارهای تعاملی",
    "nav.spec": "مشخصات فنی",
    "nav.code": "نمونه‌کدها",
    "nav.faq": "پرسش‌های متداول",
    "pref.theme": "پوسته",
    "pref.language": "زبان",
    "hero.badge": "استاندارد رسمی مهرنت",
    "hero.title": "شناسه یکتای مهر (MUID)",
    "hero.lead": "شناسه‌های ۶۴ بیتی ترتیبی بر پایه زمان با نمایش فشرده Base36 و رمزهای حساب کاربری با امنیت رمزنگاری ۲۵۶ بیتی در اکوسیستم مهرنت.",
    "hero.btn_playground": "آزمودن تولیدکننده",
    "hero.btn_spec": "مطالعه مشخصات فنی",
    "feat.bigint_title": "سازگار با پایگاه داده (BIGINT)",
    "feat.bigint_desc": "ذخیره‌سازی به عنوان یک عدد ۶۴ بیتی استاندارد در پستگرس، مای‌اس‌کیو‌ال، اس‌کیولایت و کلیک‌هاوس بدون اتلاف فضا.",
    "feat.b36_title": "نمایش فشرده Base36",
    "feat.b36_desc": "قالب متنی ۶ تا ۷ نویسه‌ای غیرحساس به حروف بزرگ و کوچک، مناسب برای آدرس‌های وب، پیامک و تایپ سریع.",
    "feat.time_title": "مرتب‌سازی بر پایه زمان (K-Sortable)",
    "feat.time_desc": "افزایش متوالی بر مبنای ثانیه که مانع از شکستگی ایندکس‌های B-tree شده و جستجوهای بازه‌ای فوق‌سریع را ممکن می‌سازد.",
    "feat.epoch_title": "مبدأ زمانی اختصاصی",
    "feat.epoch_desc": "مبدأ زمانی ۱ مهر ۱۴۰۵ (2026-09-22 UTC+3:30) که اندازه شناسه‌ها را برای دهه‌ها کوچک و کارآمد نگه می‌دارد.",
    "feat.collision_title": "۱۰,۰۰۰ شناسه در ثانیه",
    "feat.collision_desc": "پسوند تصادفی ۴ رقمی (۰۰۰۰ تا ۹۹۹۹) که مقاومت بالا در برابر برخورد در هر ثانیه را تأمین می‌کند.",
    "feat.secret_title": "امنیت ۲۵۶ بیتی Base62",
    "feat.secret_desc": "هش رمزنگاری شده ۳۲ بایتی با انتروپی بالا برای کلیدهای API، احراز هویت توکن‌های حساب و امضای وب‌هوک‌ها.",
    "tools.tab_muid": "تولید و تحلیل MUID",
    "tools.tab_secret": "رمز امنیتی ۲۵۶ بیتی",
    "tools.tab_token": "ساخت و بررسی توکن حساب",
    "copied": "در کلیپ‌بورد کپی شد!"
  }
};

/* =============================================
   DOM CONTROLLER & PLAYGROUND LOGIC
   ============================================= */

document.addEventListener('DOMContentLoaded', () => {
  initPreferences();
  initHeroGenerator();
  initPlayground();
  initCodeTabs();
  initFaqAccordion();
});

// Toast notification helper
function showToast(msg) {
  const toast = document.getElementById('toast-notice');
  if (!toast) return;
  toast.querySelector('.toast-msg').textContent = msg;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 2200);
}

// Global copy helper
window.copySnippet = function(text, btnElement) {
  navigator.clipboard.writeText(text).then(() => {
    const locale = localStorage.getItem('mehr_locale') || 'en';
    showToast(TRANSLATIONS[locale]?.copied || 'Copied to clipboard!');
    if (btnElement) {
      const origHtml = btnElement.innerHTML;
      btnElement.innerHTML = `<svg class="icon" viewBox="0 0 24 24"><use href="/icons.svg#check"></use></svg>`;
      setTimeout(() => {
        btnElement.innerHTML = origHtml;
      }, 1500);
    }
  }).catch(err => {
    console.error('Clipboard copy failed:', err);
  });
};

/* ---------------------------------------------
   Preferences (Theme & Locale)
   --------------------------------------------- */
function initPreferences() {
  const dropdownRoot = document.querySelector('[data-menu-root]');
  const trigger = document.querySelector('[data-dropdown-toggle]');
  const menu = dropdownRoot?.querySelector('.dropdown-menu');

  if (trigger && menu) {
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = menu.classList.toggle('open');
      trigger.setAttribute('aria-expanded', String(isOpen));
    });

    document.addEventListener('click', (e) => {
      if (!dropdownRoot.contains(e.target)) {
        menu.classList.remove('open');
        trigger.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // Theme buttons
  const themeBtns = document.querySelectorAll('[data-theme-val]');
  themeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const theme = btn.getAttribute('data-theme-val');
      setTheme(theme);
    });
  });

  // Language buttons
  const langBtns = document.querySelectorAll('[data-lang-val]');
  langBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const lang = btn.getAttribute('data-lang-val');
      setLocale(lang);
    });
  });

  // Sync initial state
  const currentTheme = localStorage.getItem('mehr_theme') || 'dark';
  setTheme(currentTheme, false);

  const currentLang = localStorage.getItem('mehr_locale') || 'en';
  setLocale(currentLang, false);
}

function setTheme(theme, save = true) {
  if (save) localStorage.setItem('mehr_theme', theme);
  document.documentElement.setAttribute('data-theme', theme);

  document.querySelectorAll('[data-theme-val]').forEach(b => {
    const isCur = b.getAttribute('data-theme-val') === theme;
    b.classList.toggle('active', isCur);
    b.setAttribute('aria-pressed', String(isCur));
  });

  const iconName = theme === 'light' ? 'sun' : (theme === 'black' ? 'contrast' : 'moon');
  const triggerIcon = document.querySelector('[data-pref-theme-icon] use');
  if (triggerIcon) {
    triggerIcon.setAttribute('href', `/icons.svg#${iconName}`);
  }
}

function setLocale(lang, save = true) {
  if (save) localStorage.setItem('mehr_locale', lang);
  document.documentElement.setAttribute('lang', lang);
  document.documentElement.setAttribute('dir', lang === 'fa' ? 'rtl' : 'ltr');

  document.querySelectorAll('[data-lang-val]').forEach(b => {
    const isCur = b.getAttribute('data-lang-val') === lang;
    b.classList.toggle('active', isCur);
    b.setAttribute('aria-pressed', String(isCur));
  });

  const flagName = lang === 'fa' ? 'flag-ir' : 'flag-us';
  const triggerFlag = document.querySelector('[data-pref-lang-icon] use');
  if (triggerFlag) {
    triggerFlag.setAttribute('href', `/icons.svg#${flagName}`);
  }

  // Translate static text nodes
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (t[key]) {
      el.textContent = t[key];
    }
  });
}

/* ---------------------------------------------
   Hero Quick Generator
   --------------------------------------------- */
function initHeroGenerator() {
  const valB36 = document.getElementById('hero-val-b36');
  const valRaw = document.getElementById('hero-val-raw');
  const valSecret = document.getElementById('hero-val-secret');
  const valToken = document.getElementById('hero-val-token');
  const btnRefresh = document.getElementById('hero-refresh-btn');

  function refresh() {
    const m = generateMuid();
    const sec = generateSecret();
    const tok = `${m.base36}:${sec}`;

    if (valB36) valB36.textContent = m.base36;
    if (valRaw) valRaw.textContent = m.raw.toString();
    if (valSecret) valSecret.textContent = sec.slice(0, 18) + '...';
    if (valToken) valToken.textContent = `${m.base36}:${sec.slice(0, 12)}...`;
  }

  refresh();
  if (btnRefresh) {
    btnRefresh.addEventListener('click', refresh);
  }
}

/* ---------------------------------------------
   Playground Tab Navigation & Execution
   --------------------------------------------- */
function initPlayground() {
  // Tab Switcher
  const playTabs = document.querySelectorAll('.tab-btn[data-target-panel]');
  const playPanels = document.querySelectorAll('.play-panel');

  playTabs.forEach(btn => {
    btn.addEventListener('click', () => {
      playTabs.forEach(b => b.classList.remove('active'));
      playPanels.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const target = document.getElementById(btn.getAttribute('data-target-panel'));
      if (target) target.classList.add('active');
    });
  });

  // Panel 1: MUID Generator / Decoder
  const genBtn = document.getElementById('play-muid-gen-btn');
  const inputMuid = document.getElementById('play-muid-input');
  const inspectBtn = document.getElementById('play-muid-inspect-btn');
  const resB36 = document.getElementById('res-muid-b36');
  const resRaw = document.getElementById('res-muid-raw');
  const resElapsed = document.getElementById('res-muid-elapsed');
  const resRand = document.getElementById('res-muid-rand');
  const resUtc = document.getElementById('res-muid-utc');
  const resTehran = document.getElementById('res-muid-tehran');
  const errorBox = document.getElementById('play-muid-error');

  function displayMuid(res) {
    if (errorBox) errorBox.style.display = 'none';
    if (resB36) resB36.textContent = res.base36;
    if (resRaw) resRaw.textContent = res.raw.toString();
    if (resElapsed) resElapsed.textContent = `${res.elapsed.toString()} sec (~${(Number(res.elapsed) / 86400).toFixed(2)} days)`;
    if (resRand) resRand.textContent = String(res.randomSuffix).padStart(4, '0');

    const dates = formatDates(res.dateUtc);
    if (resUtc) resUtc.textContent = dates.utcStr;
    if (resTehran) resTehran.textContent = dates.tehranStr;
  }

  function handleMuidError(err) {
    if (errorBox) {
      errorBox.textContent = err.message || 'Invalid MUID';
      errorBox.style.display = 'block';
    }
  }

  // Generate live
  if (genBtn) {
    genBtn.addEventListener('click', () => {
      try {
        const m = generateMuid();
        if (inputMuid) inputMuid.value = m.base36;
        displayMuid(m);
      } catch (err) {
        handleMuidError(err);
      }
    });
  }

  // Inspect existing
  function runInspect() {
    const val = inputMuid ? inputMuid.value.trim() : '';
    if (!val) return;
    try {
      const parsed = parseMuid(val);
      displayMuid(parsed);
    } catch (err) {
      handleMuidError(err);
    }
  }

  if (inspectBtn) inspectBtn.addEventListener('click', runInspect);
  if (inputMuid) {
    inputMuid.addEventListener('input', runInspect);
    inputMuid.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') runInspect();
    });
  }

  // Populate initially with example "6gq46u"
  if (inputMuid && !inputMuid.value) {
    inputMuid.value = '6gq46u';
    runInspect();
  }

  // Panel 2: 256-bit Secret Generator
  const secGenBtn = document.getElementById('play-sec-gen-btn');
  const secOutput = document.getElementById('play-sec-val');
  const secLen = document.getElementById('play-sec-len');

  function generateAndDisplaySecret() {
    const s = generateSecret();
    if (secOutput) secOutput.textContent = s;
    if (secLen) secLen.textContent = `${s.length} chars (256 bits)`;
  }

  if (secGenBtn) secGenBtn.addEventListener('click', generateAndDisplaySecret);
  generateAndDisplaySecret();

  // Panel 3: Account Token Builder
  const tokGenBtn = document.getElementById('play-tok-gen-btn');
  const tokInput = document.getElementById('play-tok-input');
  const tokInspectBtn = document.getElementById('play-tok-inspect-btn');
  const tokPartId = document.getElementById('tok-part-id');
  const tokPartSec = document.getElementById('tok-part-sec');
  const tokStatusBadge = document.getElementById('tok-status-badge');
  const tokErrorBox = document.getElementById('play-tok-error');

  function displayToken(accId, accSec, isValid = true, errorMsg = '') {
    if (tokPartId) tokPartId.textContent = accId || '------';
    if (tokPartSec) tokPartSec.textContent = accSec || '-------------------------------------------';
    if (tokStatusBadge) {
      tokStatusBadge.textContent = isValid ? 'VALID TOKEN' : 'INVALID';
      tokStatusBadge.style.color = isValid ? 'var(--success)' : 'var(--error)';
      tokStatusBadge.style.backgroundColor = isValid ? 'var(--success-bg)' : 'var(--error-bg)';
    }
    if (tokErrorBox) {
      if (isValid || !errorMsg) {
        tokErrorBox.style.display = 'none';
      } else {
        tokErrorBox.textContent = errorMsg;
        tokErrorBox.style.display = 'block';
      }
    }
  }

  function runTokenInspect() {
    const str = tokInput ? tokInput.value.trim() : '';
    if (!str) return;
    try {
      const res = parseAccountToken(str);
      displayToken(res.accountId, res.accountSecret, true);
    } catch (err) {
      const parts = str.split(':');
      displayToken(parts[0] || '?', parts[1] || '?', false, err.message);
    }
  }

  if (tokGenBtn) {
    tokGenBtn.addEventListener('click', () => {
      const m = generateMuid();
      const s = generateSecret();
      const t = `${m.base36}:${s}`;
      if (tokInput) tokInput.value = t;
      displayToken(m.base36, s, true);
    });
  }

  if (tokInspectBtn) tokInspectBtn.addEventListener('click', runTokenInspect);
  if (tokInput) {
    tokInput.addEventListener('input', runTokenInspect);
    // Initial example
    tokInput.value = '6gq46u:1Xy7K9pQ2LmN4zBt8vXw3zR7kM6bC5dA4e3f2g1h0iJ';
    runTokenInspect();
  }
}

/* ---------------------------------------------
   Code Implementation Tabs
   --------------------------------------------- */
function initCodeTabs() {
  const langTabs = document.querySelectorAll('.lang-tab[data-lang-panel]');
  const codePanels = document.querySelectorAll('.code-panel');

  langTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      langTabs.forEach(t => t.classList.remove('active'));
      codePanels.forEach(p => p.classList.remove('active'));

      tab.classList.add('active');
      const targetId = tab.getAttribute('data-lang-panel');
      const targetPanel = document.getElementById(targetId);
      if (targetPanel) targetPanel.classList.add('active');
    });
  });
}

/* ---------------------------------------------
   FAQ Accordion
   --------------------------------------------- */
function initFaqAccordion() {
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(item => {
    const q = item.querySelector('.faq-question');
    q?.addEventListener('click', () => {
      const wasOpen = item.classList.contains('open');
      faqItems.forEach(i => i.classList.remove('open'));
      if (!wasOpen) item.classList.add('open');
    });
  });
}
