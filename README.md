# Northgate Wholesale

A clean, business-focused storefront for a wholesale company. Products are sold
**by the case** — every item shows how many units a case (carton/box) contains,
and shoppers choose how many cases to buy, add them to a cart, and check out.

Built as a dependency-free static site (HTML + CSS + vanilla JavaScript), so it
runs anywhere with no build step and the cart persists in the browser.

## Features

- **Welcoming homepage** with a hero, product imagery, value props, and copy
  about buying wholesale. The bottom shows exactly **one row of 5 products**
  followed by a **"View full catalog"** button. Multiple links lead to the catalog.
- **Full catalog** listing products **5 per row** (responsive: 4 / 3 / 2 / 1 on
  smaller screens), each with a picture and an **Add to cart** button, plus
  category filters for easy navigation.
- **Product detail page** (open by clicking a product picture): large image,
  description, and a clear **"Each case contains N units"** callout. Pick the
  number of **cases** with a quantity stepper — the unit total and subtotal
  update live — then add to cart.
- **Cart** with editable quantities, line/order totals, and remove. A **cart
  icon with a live count is visible in the header at all times.**
- **Checkout & confirmation**: a checkout form (business-friendly, with an
  optional company field — individuals welcome too) that places an order and
  shows a confirmation with an order number. _Demo checkout — no real payment
  is processed._
- **Scroll animations** powered by GSAP ScrollTrigger on every section —
  staggered reveals, hero parallax, animated stat counters and batched product
  reveals. Animations are rebuilt on each navigation and respect
  `prefers-reduced-motion`; if the library is unavailable, content stays fully
  visible.

## Project structure

```
index.html            App shell: persistent header (brand, nav, cart) + footer
assets/
  styles.css          Design system and all component styles
  products.js         Product catalog data + SVG image generator
  cart.js             Cart state, persisted to localStorage
  animations.js       GSAP ScrollTrigger scroll animations (applied per view)
  app.js              Hash router + views (home, catalog, product, cart, checkout)
  vendor/             GSAP + ScrollTrigger (vendored locally, no CDN needed)
```

## Run it locally

It's a static site — open `index.html` directly, or serve the folder:

```bash
npx http-server -p 8123    # then visit http://localhost:8123
# or:  python3 -m http.server 8123
```

## Customizing

- **Products:** edit the `PRODUCTS` array in `assets/products.js`. Each product
  records its `casePrice`, `unitsPerCase`, and `unitLabel`.
- **Real photos:** the store renders generated SVG placeholders. To use real
  photography, render an `<img>` from a product `image` URL in
  `productImageSVG()` / the card markup.
- **Branding & colors:** the palette lives in the CSS variables at the top of
  `assets/styles.css`.
- **Real payments:** `app.js` builds the order and clears the cart on submit.
  Swap the demo submit handler for a call to a payment provider (e.g. Stripe
  Checkout) and a backend endpoint to process payment for real.

## Deploy

Any static host works — GitHub Pages, Netlify, Vercel, Cloudflare Pages, or an
S3 bucket. No server or build step required.
