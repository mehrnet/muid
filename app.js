/**
 * MUID — Mehr Unique ID Specification & Interactive Tools
 * Copyright (c) 2026 Mehrnet (https://mehrnet.com)
 */

const EPOCH_SEC = 1790022600n; // 2026-09-22T00:00:00+03:30 (2026-09-21T20:30:00Z)
const BASE36_CHARS = '0123456789abcdefghijklmnopqrstuvwxyz';
const BASE62_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

export const API_TOKEN_REGEX = /^[0-9a-z]{6,12}:[0-9a-zA-Z]{43}$/;

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
    throw new Error('Invalid base36: allowed characters are 0-9 and a-z');
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
  if (!str) throw new Error('Empty identifier');

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

export function generateSecret() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let num = 0n;
  for (const b of bytes) {
    num = (num << 8n) | BigInt(b);
  }
  return encodeBase62(num).padStart(43, '0');
}

export function parseAccountToken(token) {
  const clean = String(token).trim();
  const sepIdx = clean.indexOf(':');
  if (sepIdx === -1) {
    throw new Error('Missing colon. Expected "<account_id>:<account_secret>"');
  }
  const idPart = clean.slice(0, sepIdx);
  const secretPart = clean.slice(sepIdx + 1);

  const muid = parseMuid(idPart);
  if (!secretPart || !/^[0-9A-Za-z]{42,43}$/.test(secretPart)) {
    throw new Error('Invalid secret: must be 42-43 base62 characters');
  }

  const normalized = `${muid.base36}:${secretPart}`;
  return {
    accountId: muid.base36,
    accountSecret: secretPart,
    muid,
    matchesApiRegex: API_TOKEN_REGEX.test(normalized)
  };
}

/* =============================================
   FORMATTING & I18N
   ============================================= */

function formatDates(date) {
  const utcStr = date.toISOString().replace('T', ' ').replace('.000Z', ' UTC');
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

const TRANSLATIONS = {
  en: {
    "nav.credentials": "Credentials",
    "nav.spec": "Specification",
    "nav.code": "Examples",
    "pref.theme": "Theme",
    "pref.language": "Language",
    "hero.badge": "Standard Spec",
    "hero.title_lead": "Mehr Unique ID",
    "hero.subtitle": "64-bit BigInt database IDs, Base36 case-insensitive identifiers, and 256-bit Base62 account authentication tokens.",
    "spec.title": "MUID Technical Specification",
    "spec.subtitle": "Formal technical architecture, Tehran epoch mathematics, 64-bit BigInt database layout, Base36 identifiers, and 256-bit authentication tokens.",
    "spec.epoch_title": "1. 64-Bit Numeric Database Identifier",
    "spec.epoch_desc": "Generated sequentially from the fixed Tehran epoch with 4 random digits:",
    "spec.secret_title": "3. 256-Bit Secret & API Regex",
    "spec.secret_desc": "256-bit security hash and standardized authorization token regex:",
    "spec.decision_title": "The Genesis Epoch Decision (Why 2026-09-22?)",
    "spec.decision_badge": "Day 0 Offset",
    "spec.step0_label": "Day 0 · Genesis Epoch",
    "spec.step0_desc": "The timeline begins at 00:00:00 (UTC+3:30) (Unix timestamp 1790022600). Genesis state, system bootstrapping, and initial node migrations execute cleanly within this 0-indexed day without producing negative offsets.",
    "spec.step1_label": "Day 1 · Official Release",
    "spec.step1_desc": "The official release of Mehr begins. User accounts created on launch day start from Day 1 (after 86,400s), ensuring all public identifiers follow clean positive natural numbers.",
    "examples.subtitle": "Self-contained production implementations in Go, JavaScript, TypeScript, Python, PHP, and POSIX Shell.",
    "btn.regenerate": "Regenerate",
    "label.account_id": "Account ID (Base36)",
    "label.raw_id": "Raw Database ID (BigInt)",
    "label.secret": "MUID Secret (Base62 · 256-bit)",
    "label.token": "Account Token (ID : Secret)",
    "inspector.placeholder": "Paste any ID (e.g. 6gq46u) or token to inspect...",
    "inspector.btn": "Inspect",
    "copied": "Copied!"
  },
  fa: {
    "nav.credentials": "اطلاعات حساب",
    "nav.spec": "مشخصات فنی",
    "nav.code": "نمونه‌کدها",
    "pref.theme": "پوسته",
    "pref.language": "زبان",
    "hero.badge": "استاندارد رسمی",
    "hero.title_lead": "شناسه یکتای مهر",
    "hero.subtitle": "شناسه‌های ۶۴ بیتی در دیتابیس، نمایش فشرده Base36 و توکن‌های ۲۵۶ بیتی امنیتی Base62.",
    "spec.title": "مشخصات فنی شناسه یکتای مهر",
    "spec.subtitle": "معماری فنی، محاسبات مبدا زمانی تهران، ساختار عدد ۶۴ بیتی دیتابیس، شناسه‌های Base36 و توکن‌های ۲۵۶ بیتی.",
    "spec.epoch_title": "۱. مبدا زمانی و شناسه عددی",
    "spec.epoch_desc": "تولید ترتیبی بر اساس مبدا زمانی تهران همراه با ۴ رقم تصادفی:",
    "spec.secret_title": "۲. رمز امنیتی و رگکس API",
    "spec.secret_desc": "رمز امنیتی ۲۵۶ بیتی و قالب اعتبارسنجی استاندارد توکن:",
    "spec.decision_title": "علت انتخاب مبدا زمانی (چرا ۲۰۲۶-۰۹-۲۲؟)",
    "spec.decision_badge": "آفست روز صفر",
    "spec.step0_label": "روز صفر · مبدا پیدایش (Genesis)",
    "spec.step0_desc": "شمارش زمان از ۰۰:۰۰:۰۰ به وقت تهران (تایم‌استمپ ۱۷۹۰۰۲۲۶۰۰) آغاز می‌شود. داده‌های پایه جنسیس و پیکربندی اولیه بدون نیاز به زمان‌های منفی در این روز صفر ثبت می‌شوند.",
    "spec.step1_label": "روز یکم · انتشار عمومی مهر",
    "spec.step1_desc": "آغاز فعالیت عمومی مهر (۱ مهر ۲۵۸۵). شناسه‌های کاربران از روز یکم (پس از ۸۶٬۴۰۰ ثانیه) ثبت شده و به شکلی منظم و افزایشی ادامه می‌یابند.",
    "examples.subtitle": "پیاده‌سازی مستقل در زبان‌های Go، جاوااسکریپت، تایپ‌اسکریپت، پایتون، PHP و POSIX Shell.",
    "btn.regenerate": "تولید مجدد",
    "label.account_id": "شناسه حساب (Base36)",
    "label.raw_id": "شناسه خام دیتابیس (BigInt)",
    "label.secret": "رمز امنیتی (Base62 · ۲۵۶ بیت)",
    "label.token": "توکن حساب (شناسه : رمز)",
    "inspector.placeholder": "برای بررسی، شناسه یا توکن را وارد کنید...",
    "inspector.btn": "تحلیل",
    "copied": "کپی شد!"
  }
};

/* =============================================
   CONTROLLER & INITIALIZATION
   ============================================= */

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    initPreferences();
    initCredentialsController();
    initCodeTabs();
    initRouter();
    highlightAllCodeBlocks();
  });
}

function showToast(msg) {
  const toast = document.getElementById('toast-notice');
  if (!toast) return;
  toast.querySelector('.toast-msg').textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 1800);
}

if (typeof window !== 'undefined') {
  window.copySnippet = function(textOrElement, btnElement) {
    let content = '';
    if (typeof textOrElement === 'string') {
      content = textOrElement;
    } else if (textOrElement && textOrElement.dataset && textOrElement.dataset.raw) {
      content = textOrElement.dataset.raw;
    } else if (textOrElement && textOrElement.innerText) {
      content = textOrElement.innerText;
    } else if (textOrElement && textOrElement.textContent) {
      content = textOrElement.textContent;
    }

    navigator.clipboard.writeText(content).then(() => {
      const locale = localStorage.getItem('mehr_locale') || 'en';
      showToast(TRANSLATIONS[locale]?.copied || 'Copied!');
      if (btnElement) {
        btnElement.classList.add('copied');
        setTimeout(() => btnElement.classList.remove('copied'), 1200);
      }
    });
  };
}

function initCredentialsController() {
  const elAccId = document.getElementById('cred-account-id');
  const elRawId = document.getElementById('cred-raw-id');
  const elSecret = document.getElementById('cred-secret');
  const elToken = document.getElementById('cred-token');

  const elUtc = document.getElementById('meta-utc');
  const elTehran = document.getElementById('meta-tehran');
  const elElapsed = document.getElementById('meta-elapsed');
  const elRand = document.getElementById('meta-rand');
  const elRegex = document.getElementById('meta-regex');

  const btnRegen = document.getElementById('btn-regenerate');
  const inputInspect = document.getElementById('inspector-input');
  const btnInspect = document.getElementById('inspector-btn');

  function renderCreds(muid, secret) {
    if (elAccId) elAccId.textContent = muid.base36;
    if (elRawId) elRawId.textContent = muid.raw.toString();
    if (elSecret) elSecret.textContent = secret;
    if (elToken) elToken.textContent = `${muid.base36}:${secret}`;

    const dates = formatDates(muid.dateUtc);
    if (elUtc) elUtc.textContent = dates.utcStr;
    if (elTehran) elTehran.textContent = dates.tehranStr;
    if (elElapsed) elElapsed.textContent = `${muid.elapsed.toString()}s`;
    if (elRand) elRand.textContent = String(muid.randomSuffix).padStart(4, '0');

    const token = `${muid.base36}:${secret}`;
    const matches = API_TOKEN_REGEX.test(token);
    if (elRegex) {
      elRegex.textContent = matches ? 'API Regex Valid' : 'Regex Non-standard';
      elRegex.classList.toggle('regex-pill', matches);
    }
  }

  function regenerate() {
    const m = generateMuid();
    const s = generateSecret();
    renderCreds(m, s);
  }

  if (btnRegen) {
    btnRegen.addEventListener('click', () => {
      btnRegen.classList.add('spinning');
      setTimeout(() => btnRegen.classList.remove('spinning'), 300);
      regenerate();
    });
  }

  function handleInspect() {
    const val = inputInspect ? inputInspect.value.trim() : '';
    if (!val) return;
    try {
      if (val.includes(':')) {
        const parsed = parseAccountToken(val);
        renderCreds(parsed.muid, parsed.accountSecret);
      } else {
        const m = parseMuid(val);
        // keep current secret or generate one
        const curSec = elSecret?.textContent || generateSecret();
        renderCreds(m, curSec);
      }
    } catch (err) {
      showToast(err.message || 'Invalid format');
    }
  }

  if (btnInspect) btnInspect.addEventListener('click', handleInspect);
  if (inputInspect) {
    inputInspect.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleInspect();
    });
  }

  // Initial client-side generation
  regenerate();
}

function initPreferences() {
  const root = document.querySelector('[data-menu-root]');
  const trigger = document.querySelector('[data-dropdown-toggle]');
  const menu = root?.querySelector('.dropdown-menu');

  if (trigger && menu) {
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = menu.classList.toggle('open');
      trigger.setAttribute('aria-expanded', String(open));
    });

    document.addEventListener('click', (e) => {
      if (!root.contains(e.target)) {
        menu.classList.remove('open');
        trigger.setAttribute('aria-expanded', 'false');
      }
    });
  }

  document.querySelectorAll('[data-theme-val]').forEach(btn => {
    btn.addEventListener('click', () => setTheme(btn.getAttribute('data-theme-val')));
  });

  document.querySelectorAll('[data-lang-val]').forEach(btn => {
    btn.addEventListener('click', () => setLocale(btn.getAttribute('data-lang-val')));
  });

  setTheme(localStorage.getItem('mehr_theme') || 'dark', false);
  setLocale(localStorage.getItem('mehr_locale') || 'en', false);
}

function setTheme(theme, save = true) {
  if (save) localStorage.setItem('mehr_theme', theme);
  document.documentElement.setAttribute('data-theme', theme);

  document.querySelectorAll('[data-theme-val]').forEach(b => {
    const active = b.getAttribute('data-theme-val') === theme;
    b.classList.toggle('active', active);
  });

  const iconName = theme === 'light' ? 'sun' : (theme === 'black' ? 'contrast' : 'moon');
  const icon = document.querySelector('[data-pref-theme-icon] use');
  if (icon) icon.setAttribute('href', `#${iconName}`);
}

function setLocale(lang, save = true) {
  if (save) localStorage.setItem('mehr_locale', lang);
  document.documentElement.setAttribute('lang', lang);
  document.documentElement.setAttribute('dir', lang === 'fa' ? 'rtl' : 'ltr');

  document.querySelectorAll('[data-lang-val]').forEach(b => {
    const active = b.getAttribute('data-lang-val') === lang;
    b.classList.toggle('active', active);
  });

  const flagName = lang === 'fa' ? 'flag-ir' : 'flag-us';
  const flag = document.querySelector('[data-pref-lang-icon] use');
  if (flag) flag.setAttribute('href', `#${flagName}`);

  const dict = TRANSLATIONS[lang] || TRANSLATIONS.en;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const k = el.getAttribute('data-i18n');
    if (dict[k]) {
      el.textContent = dict[k];
    }
  });
  const input = document.getElementById('inspector-input');
  if (input && dict["inspector.placeholder"]) {
    input.placeholder = dict["inspector.placeholder"];
  }
}

function initCodeTabs() {
  const tabs = document.querySelectorAll('.lang-btn-sm[data-lang-panel]');
  const panels = document.querySelectorAll('.code-panel-sm');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));

      tab.classList.add('active');
      const id = tab.getAttribute('data-lang-panel');
      const panel = document.getElementById(id);
      if (panel) panel.classList.add('active');
    });
  });
}

/* =============================================
   SPA ROUTER
   ============================================= */

function initRouter() {
  function getNormalizedRoute(path) {
    const clean = (path || '/').split('?')[0].split('#')[0].replace(/\/+$/, '') || '/';
    if (clean === '/spec') return '/spec';
    if (clean === '/examples' || clean === '/code') return '/examples';
    return '/credentials';
  }

  function navigateTo(targetPath, push = true) {
    const normalized = getNormalizedRoute(targetPath);

    const views = {
      '/credentials': document.getElementById('view-credentials'),
      '/spec': document.getElementById('view-spec'),
      '/examples': document.getElementById('view-examples')
    };

    Object.entries(views).forEach(([route, el]) => {
      if (!el) return;
      if (route === normalized) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });

    document.querySelectorAll('.nav-link[data-route], .bottom-nav-link[data-route]').forEach(link => {
      const route = link.getAttribute('data-route');
      if (route === normalized || (normalized === '/credentials' && (route === '/' || route === '/credentials'))) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    if (push) {
      const pushUrl = targetPath === '/' ? '/' : normalized;
      if (window.location.pathname !== pushUrl) {
        window.history.pushState(null, '', pushUrl);
      }
    }

    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[data-route], a.nav-brand');
    if (!link) return;

    const route = link.getAttribute('data-route') || link.getAttribute('href');
    if (route && (route.startsWith('/') || route.startsWith('#'))) {
      e.preventDefault();
      const target = route.startsWith('#') ? `/${route.slice(1)}` : route;
      navigateTo(target, true);
    }
  });

  window.addEventListener('popstate', () => {
    navigateTo(window.location.pathname, false);
  });

  // Initial routing based on current URL path
  navigateTo(window.location.pathname, false);
}

/* =============================================
   SELF-CONTAINED SYNTAX HIGHLIGHTER
   ============================================= */

const KEYWORDS = new Set([
  'package', 'import', 'const', 'var', 'func', 'function', 'export', 'def',
  'return', 'if', 'else', 'elif', 'for', 'while', 'do', 'done', 'then', 'fi',
  'case', 'esac', 'class', 'type', 'struct', 'interface', 'new', 'make',
  'throw', 'try', 'catch', 'finally', 'let', 'from', 'as', 'with', 'in', 'of',
  'local', 'echo', 'break', 'continue', 'array'
]);

const TYPES_AND_LITERALS = new Set([
  'int', 'int64', 'string', 'bigint', 'bool', 'byte', 'error', 'rune',
  'true', 'false', 'null', 'nil', 'None', 'True', 'False',
  'Time', 'Uint8Array', 'Uint32Array', 'Date', 'tuple', 'dict',
  'BigInt', 'Math', 'crypto'
]);

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function highlightCode(rawCode) {
  const tokenRegex = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/|#[^\n]*)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)|(\b0x[a-fA-F0-9]+\b|\b\d+n?\b)|(\b[a-zA-Z_][a-zA-Z0-9_]*\b)|([&<>])/g;
  return rawCode.replace(tokenRegex, (match, comment, str, num, ident, htmlChar) => {
    if (comment) return `<span class="tok-comment">${escapeHtml(comment)}</span>`;
    if (str) return `<span class="tok-string">${escapeHtml(str)}</span>`;
    if (num) return `<span class="tok-number">${num}</span>`;
    if (ident) {
      if (KEYWORDS.has(ident)) return `<span class="tok-keyword">${ident}</span>`;
      if (TYPES_AND_LITERALS.has(ident)) return `<span class="tok-type">${ident}</span>`;
      return ident;
    }
    if (htmlChar) return escapeHtml(htmlChar);
    return match;
  });
}

export function highlightCodeWithLineNumbers(rawCode) {
  const clean = rawCode.replace(/\r\n/g, '\n').replace(/\n$/, '');
  const lines = clean.split('\n');
  return lines.map((line, idx) => {
    const lineNum = idx + 1;
    const highlighted = highlightCode(line);
    return `<span class="code-line"><span class="line-num">${lineNum}</span><span class="line-content">${highlighted || ' '}</span></span>`;
  }).join('');
}

function highlightAllCodeBlocks() {
  document.querySelectorAll('pre code').forEach(block => {
    if (block.querySelector('.code-line')) return;
    if (!block.dataset.raw) {
      block.dataset.raw = block.textContent;
    }
    block.innerHTML = highlightCodeWithLineNumbers(block.dataset.raw);
  });
}
