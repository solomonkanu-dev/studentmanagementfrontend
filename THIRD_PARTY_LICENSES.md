# Third-Party Licenses and Compliance

## License Compliance Status

This document outlines the open-source and commercial dependencies used in StudentMS and their license compliance status.

---

## ⚠️ AGPL-Licensed Dependency — Action Required

### intro.js v8.3.2

- **License**: AGPL-3.0 (or Commercial License)
- **Status**: ⚠️ **COMPLIANCE RISK** — This is a proprietary project
- **Usage**: Feature-guided tour on dashboards ([components/intro/IntroTour.tsx](components/intro/IntroTour.tsx))
- **Issue**: AGPL-3.0 requires source code disclose for distributed software. Since StudentMS is proprietary, you **must** either:

  1. **Option A: Purchase Commercial License** (Recommended for continued use)
     - Visit: https://introjs.com/
     - Purchase a commercial license from Aleppo Venture
     - Document the license key/purchase in this file
  
  2. **Option B: Replace with Permissive Alternative** (Recommended if no license purchased)
     - **Shepherd.js** (MIT) — Recommended replacement, similar API, extensive customization
     - **Driver.js** (MIT) — Lightweight alternative, modern syntax
     - **Reactour** (MIT) — React-specific, easy integration
     - Requires updating [components/intro/IntroTour.tsx](components/intro/IntroTour.tsx) and [app/globals.css](app/globals.css) intro.js theme styles
  
  3. **Option C: Remove Feature** (Minimal if not critical)
     - Remove intro feature if onboarding tours aren't essential
     - Removes CSS styling and React hook dependencies

**Deadline**: Before production release or commercial distribution.

---

## Permissive Dependencies (✅ License Compliant)

### MIT-Licensed

- `@anthropic-ai/sdk` — MIT
- `@hookform/resolvers` — MIT
- `@react-pdf/renderer` — MIT
- `@tanstack/react-query` — MIT
- `@vercel/analytics` — MIT
- `apexcharts` — MIT
- `axios` — MIT
- `dropzone` — MIT
- `flatpickr` — MIT
- `html5-qrcode` — MIT
- `jsvectormap` — MIT
- `lucide-react` — MIT
- `next` — MIT
- `nouislider` — MIT
- `react` — MIT
- `react-apexcharts` — MIT
- `react-dom` — MIT
- `react-hook-form` — MIT
- `react-qr-code` — MIT
- `socket.io-client` — MIT
- `sonner` — MIT
- `swiper` — MIT
- `zod` — MIT

### Apache 2.0-Licensed

- `@tailwindcss/postcss` — Apache-2.0

---

## Commercial License Status

If you have obtained a commercial license for intro.js, please document it below:

```
PROJECT: StudentMS
VENDOR: Aleppo Venture (introjs.com)
PRODUCT: intro.js Commercial License
LICENSE KEY/ID: [INSERT]
PURCHASE DATE: [INSERT]
EXPIRY DATE: [INSERT]
RENEWAL DATE: [INSERT]
CONTACT: [INSERT]
```

---

## Audit Trail

| Date | Action | Status |
|------|--------|--------|
| 2026-04-20 | Created compliance document | Pending Resolution |
| | Action taken on intro.js | — |

---

## Compliance Checklist

- [ ] Commercial license obtained and documented above, OR
- [ ] intro.js replaced with permissive alternative (update this file), OR  
- [ ] Feature removed (update this file)
- [ ] All CSS dependencies removed if applicable
- [ ] No AGPL source code included in distribution

**Note**: This project should not be distributed commercially until AGPL compliance is resolved.
