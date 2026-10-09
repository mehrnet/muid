# Mehr Unique ID (MUID)

[![CI](https://github.com/mehrnet/muid/actions/workflows/ci.yml/badge.svg)](https://github.com/mehrnet/muid/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-Proprietary-amber.svg)](https://mehrnet.com)

The official specification, interactive tools, and multi-language implementation libraries for **Mehr Unique ID (MUID)** — the standardized 64-bit identifier and 256-bit cryptographic account authentication token format across the [Mehrnet](https://mehrnet.com) ecosystem.

- **Live Specification & Interactive Playground:** [https://muid.mehrnet.com](https://muid.mehrnet.com)
- **GitHub Repository:** [https://github.com/mehrnet/muid](https://github.com/mehrnet/muid)

---

## ⚡ Overview

MUID solves common database indexing, serialization, and developer ergonomics problems associated with 128-bit UUIDs and complex distributed snowflake services.

1. **Native 64-bit Storage:** Stored as an 8-byte `BIGINT` in relational databases (PostgreSQL, SQLite, MySQL, ClickHouse) for fast B-tree indexing and zero memory waste.
2. **K-Sortable / Chronologically Clustered:** Generated sequentially based on seconds elapsed since the Mehrnet epoch, eliminating page splits and B-tree index fragmentation.
3. **Compact User-Facing Base36:** Encoded as a 6 to 7 character alphanumeric string (case-insensitive) for clean URLs, SMS, and user-friendly typing.
4. **Sub-Second High Concurrency:** 4 random decimal digits (`0000–9999`) provide 10,000 distinct ID slots per second per node.
5. **256-bit Cryptographic Secret Hash:** 32 bytes of CSPRNG entropy encoded in Base62 (`0-9A-Za-z`) for secure bearer authentication.
6. **Unified Account Token:** Standardized format `"<account_id>:<account_secret>"` across all Mehrnet services (e.g. MehrSwap, Miyan, MehrNotify).

---

## 📐 Specification

### 1. Epoch
- **Epoch Date (Tehran):** `2026-09-22 00:00:00 (UTC+3:30)`
- **Epoch Date (UTC):** `2026-09-21 20:30:00 UTC`
- **Unix Timestamp:** `1790022600` seconds

#### 💡 The Genesis Epoch Decision (Why 2026-09-22?)
The first official release day of Mehr was **2026-09-23** (which corresponds to **2585-07-01** / 1 Mehr 2585 in the Imperial calendar).

The MUID epoch was deliberately anchored at **Day 0** (one day prior to release, `2585-06-31` / 31 Shahrivar 2585):
- **Day 0 · Genesis (`2026-09-22`):** System bootstrap, internal migrations, and node configuration execute cleanly in the `[0, 86400)` second window without requiring negative timestamps.
- **Day 1 · Public Release (`2026-09-23`):** Official launch day begins after 86,400 elapsed seconds, ensuring all public user accounts and identifiers start as clean, positive, naturally ascending numbers.

### 2. Identifier Composition
```
ElapsedSeconds = UnixTimestamp - 1790022600
RandomSuffix   = CSPRNG integer in range [0, 9999]
RawNumericID   = (ElapsedSeconds * 10000) + RandomSuffix
AccountID      = Base36(RawNumericID)  [case-insensitive]
```

### 3. Test Vectors
| Field | Value | Base36 Representation |
| :--- | :--- | :--- |
| **Epoch Launch (0s)** | `0000` | `0` |
| **Launch Day Account** | `390889398` (39,088s + 9398) | `6gq46u` |
| **Sample Numeric ID** | `13954201234` (1,395,420s + 1234) | `6eryyky` |

### 4. MUID Secret & Account Token
- **Secret Hash:** 256-bit (32 bytes) CSPRNG random bytes encoded in Base62 (`0-9A-Za-z`). Length is 42 to 43 characters.
  - Example 1: `1Xy7K9pQ2LmN4zBt8vXw3zR7kM6bC5dA4e3f2g1h0iJ`
  - Example 2: `5nB8mQ1rW4tY7uI0oP3aS6dF9gH2jK5lZ8xC1vB4nM`
- **Account Token:** `"<account id>:<account secret>"`
  - Example: `6gq46u:1Xy7K9pQ2LmN4zBt8vXw3zR7kM6bC5dA4e3f2g1h0iJ`

### 5. API Regex Validator
All backend gateways, APIs, and microservices validate account tokens using this unified regular expression:
```regex
^[0-9a-z]{6,12}:[0-9a-zA-Z]{43}$
```
- `^[0-9a-z]{6,12}`: Base36 Account ID (6 to 12 lowercase characters).
- `:`: Delimiter colon.
- `[0-9a-zA-Z]{43}$`: 43-character Base62 256-bit cryptographic secret hash.

---

## 💻 Implementation Examples

Reference implementations are available on the website and in documentation for:
- [Go (Golang)](https://muid.mehrnet.com/#code)
- [JavaScript (Browser & Node.js)](https://muid.mehrnet.com/#code)
- [TypeScript](https://muid.mehrnet.com/#code)
- [Python](https://muid.mehrnet.com/#code)
- [PHP](https://muid.mehrnet.com/#code)
- [Bash (POSIX Shell)](https://muid.mehrnet.com/#code)

---

## 🧪 Testing

The repository includes a comprehensive unit test suite covering specification test vectors, round trips, case-insensitivity, and cryptographic entropy bounds:

```bash
# Run test suite
npm test
```

---

## 🚀 Deployment

The landing site is deployed as a static site via Cloudflare Workers / Wrangler with assets configured to `.`:

```bash
# Preview locally
npx wrangler dev

# Deploy to muid.mehrnet.com
npx wrangler deploy
```

Configuration in `wrangler.jsonc`:
```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "muid",
  "compatibility_date": "2026-07-15",
  "assets": {
    "directory": ".",
    "not_found_handling": "single-page-application"
  },
  "routes": [
    {
      "pattern": "muid.mehrnet.com",
      "custom_domain": true
    }
  ]
}
```

---

## 📄 License

Proprietary © 2026 [Mehrnet](https://mehrnet.com). All rights reserved.
