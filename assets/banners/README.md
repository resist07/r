# Banners

On-brand marketing banners for Northgate Wholesale, built as self-contained
HTML/CSS and exported to PNG with headless Chromium (no external image
services). Brand source of truth is the live storefront: champagne gold
`#b89254` on deep ink `#1b1f27`, Fraunces (display) + Inter (UI), cream
surfaces, and the product-tile motif.

## Layout

```
_fonts/                         Vendored brand fonts (woff2) for offline render
storefront-hero/
  hero.html                     Editable source for the website hero banner
  premium-ink-gold-1920x600.png      1× export (exact spec)
  premium-ink-gold-1920x600@2x.png   2× retina export (3840×1200)
```

Filenames follow `{style}-{width}x{height}.png` (kebab-case); `@2x` marks
retina exports.

## Design rules applied

- Safe zone: text/CTA kept within the central area, clear of the edges.
- One CTA, high-contrast gold, action verb ("Shop the catalog →").
- Two typefaces max (Fraunces + Inter), headline ≥32px, body ≥16px, ≥4.5:1
  contrast.
- ~60/40 image-to-text balance.

## Regenerate a PNG

Serve the repo and screenshot the `.banner` element at the target size:

```bash
npx http-server . -p 8123 -c-1
# then, with Playwright/Chromium, open
#   /assets/banners/storefront-hero/hero.html
# wait for document.fonts.ready and screenshot ".banner" at 1920×600 (and 2×).
```

Edit copy/colours directly in `hero.html`.
