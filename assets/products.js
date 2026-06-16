/**
 * Product catalog data for Northgate Wholesale.
 *
 * Every product is sold by the CASE (a.k.a. carton / box). Each record records
 * how many individual units a single case contains, so shoppers always know
 * exactly what one "box" gets them.
 *
 *   casePrice     – price for one full case (what the customer is charged per box)
 *   unitsPerCase  – how many individual items are packed in one case
 *   unitLabel     – what a single item is called (bottles, cans, bags, ...)
 *
 * To use real photography, give a product an `image` URL and the renderer will
 * use it instead of the generated placeholder.
 */

// Each category gets its own gradient so the storefront feels cohesive.
const CATEGORY_STYLES = {
  Beverages: { from: "#3a8dde", to: "#1657a8" },
  Snacks:    { from: "#f7a838", to: "#e07c1a" },
  Pantry:    { from: "#46b06a", to: "#268048" },
  Household: { from: "#2bb7b0", to: "#127f86" },
};

const PRODUCTS = [
  // ── Beverages ───────────────────────────────────────────────
  { id: "spring-water",     name: "Spring Water 500ml",        category: "Beverages", emoji: "💧", unitsPerCase: 24, unitLabel: "bottles", casePrice: 9.60,
    description: "Crisp, natural spring water in convenient 500ml bottles. A high-turnover staple for break rooms, events, retail coolers and resale." },
  { id: "cola-classic",     name: "Cola Classic 330ml",        category: "Beverages", emoji: "🥤", unitsPerCase: 24, unitLabel: "cans",    casePrice: 11.50,
    description: "Classic cola in recyclable 330ml cans. A dependable best-seller for convenience stores, vending and food service." },
  { id: "orange-juice",     name: "Orange Juice 1L",           category: "Beverages", emoji: "🧃", unitsPerCase: 12, unitLabel: "cartons", casePrice: 18.00,
    description: "100% pressed orange juice in shelf-stable 1L cartons. Perfect for cafés, hotels and breakfast service." },
  { id: "energy-drink",     name: "Energy Drink 250ml",        category: "Beverages", emoji: "⚡", unitsPerCase: 24, unitLabel: "cans",    casePrice: 26.40,
    description: "High-caffeine energy drink in 250ml cans. Strong margins and fast rotation in convenience and gym retail." },
  { id: "sparkling-water",  name: "Sparkling Water 330ml",     category: "Beverages", emoji: "🫧", unitsPerCase: 24, unitLabel: "cans",    casePrice: 13.20,
    description: "Lightly carbonated, zero-sugar sparkling water in slim 330ml cans. A premium, on-trend addition to any cooler." },

  // ── Snacks ──────────────────────────────────────────────────
  { id: "potato-chips",     name: "Potato Chips 50g",          category: "Snacks", emoji: "🍟", unitsPerCase: 30, unitLabel: "bags",  casePrice: 21.00,
    description: "Crunchy salted potato chips in single-serve 50g bags. Ideal for cafés, lunch counters and impulse displays." },
  { id: "chocolate-bars",   name: "Chocolate Bars 45g",        category: "Snacks", emoji: "🍫", unitsPerCase: 48, unitLabel: "bars",  casePrice: 28.80,
    description: "Smooth milk chocolate bars in a 48-count counter case. A proven point-of-sale impulse buy." },
  { id: "mixed-nuts",       name: "Mixed Nuts 200g",           category: "Snacks", emoji: "🥜", unitsPerCase: 12, unitLabel: "bags",  casePrice: 30.00,
    description: "Lightly roasted and salted mixed nuts in resealable 200g bags. A premium pantry and bar snack." },
  { id: "granola-bars",     name: "Granola Bars 35g",          category: "Snacks", emoji: "🌾", unitsPerCase: 36, unitLabel: "bars",  casePrice: 19.80,
    description: "Wholegrain oat and honey granola bars, individually wrapped. A grab-and-go favourite for offices and gyms." },
  { id: "pretzels",         name: "Pretzels 100g",             category: "Snacks", emoji: "🥨", unitsPerCase: 24, unitLabel: "bags",  casePrice: 16.80,
    description: "Crunchy salted pretzels in 100g sharing bags. Great for bars, pantries and party platters." },

  // ── Pantry ──────────────────────────────────────────────────
  { id: "olive-oil",        name: "Extra Virgin Olive Oil 1L", category: "Pantry", emoji: "🫒", unitsPerCase: 12, unitLabel: "bottles", casePrice: 54.00,
    description: "Cold-pressed extra virgin olive oil in 1L bottles. A kitchen essential for restaurants, delis and caterers." },
  { id: "pasta",            name: "Durum Pasta 500g",          category: "Pantry", emoji: "🍝", unitsPerCase: 20, unitLabel: "packs",   casePrice: 17.00,
    description: "Premium durum wheat penne in 500g packs. A versatile, long-shelf-life staple for any food business." },
  { id: "canned-tomatoes",  name: "Chopped Tomatoes 400g",     category: "Pantry", emoji: "🍅", unitsPerCase: 24, unitLabel: "cans",    casePrice: 19.20,
    description: "Rich Italian chopped tomatoes in 400g cans. The backbone of sauces, soups and stews in volume kitchens." },
  { id: "basmati-rice",     name: "Basmati Rice 1kg",          category: "Pantry", emoji: "🍚", unitsPerCase: 10, unitLabel: "bags",    casePrice: 22.00,
    description: "Aromatic long-grain basmati rice in 1kg bags. A reliable, high-demand pantry line." },
  { id: "instant-coffee",   name: "Instant Coffee 200g",       category: "Pantry", emoji: "☕", unitsPerCase: 12, unitLabel: "jars",    casePrice: 48.00,
    description: "Rich freeze-dried instant coffee in 200g jars. Strong repeat-purchase line for offices and retail." },

  // ── Household ───────────────────────────────────────────────
  { id: "paper-towels",     name: "Paper Towels 2-ply",        category: "Household", emoji: "🧻", unitsPerCase: 24, unitLabel: "rolls",   casePrice: 26.40,
    description: "Absorbent 2-ply kitchen paper towels, 24 rolls per case. A constant restock for offices, kitchens and facilities." },
  { id: "dish-soap",        name: "Dish Soap 750ml",           category: "Household", emoji: "🧼", unitsPerCase: 12, unitLabel: "bottles", casePrice: 21.60,
    description: "Concentrated grease-cutting dish soap in 750ml bottles. A workhorse for kitchens and cleaning crews." },
  { id: "trash-bags",       name: "Trash Bags 50-count",       category: "Household", emoji: "🗑️", unitsPerCase: 20, unitLabel: "packs",   casePrice: 30.00,
    description: "Heavy-duty tear-resistant trash bags, 50 per pack. An everyday essential for any facility or business." },
  { id: "laundry-detergent",name: "Laundry Detergent 2L",      category: "Household", emoji: "🧺", unitsPerCase: 6,  unitLabel: "bottles", casePrice: 39.00,
    description: "High-efficiency liquid laundry detergent in 2L bottles. Built for hospitality, gyms and laundromats." },
  { id: "all-purpose-cleaner", name: "All-Purpose Cleaner 750ml", category: "Household", emoji: "🧴", unitsPerCase: 12, unitLabel: "bottles", casePrice: 21.00,
    description: "Multi-surface spray cleaner in 750ml trigger bottles. Keeps kitchens, offices and storefronts spotless." },
];

/** Per-unit price derived from the case price (helps buyers compare value). */
function unitPrice(product) {
  return product.casePrice / product.unitsPerCase;
}

/** Look up a single product by its id. */
function getProduct(id) {
  return PRODUCTS.find((p) => p.id === id);
}

/**
 * Build a clean SVG placeholder "photo" for a product: a category-coloured
 * gradient panel with the product icon and case-size badge. Rendered inline so
 * the store works with zero network requests. Swap in real images any time.
 */
function productImageSVG(product) {
  const style = CATEGORY_STYLES[product.category] || { from: "#5b6b82", to: "#33405a" };
  const gid = `g-${product.id}`;
  const hid = `h-${product.id}`;
  const badge = `${product.unitsPerCase} ${product.unitLabel} / case`;
  const badgeW = Math.min(300, Math.round(badge.length * 9.2 + 40));
  const badgeX = Math.round((400 - badgeW) / 2);
  return `
    <svg class="product-photo" viewBox="0 0 400 300" role="img"
         aria-label="${product.name}" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="${style.from}" />
          <stop offset="1" stop-color="${style.to}" />
        </linearGradient>
        <radialGradient id="${hid}" cx="32%" cy="24%" r="80%">
          <stop offset="0" stop-color="#ffffff" stop-opacity="0.38" />
          <stop offset="55%" stop-color="#ffffff" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="400" height="300" fill="url(#${gid})" />
      <circle cx="332" cy="60" r="118" fill="#ffffff" opacity="0.08" />
      <circle cx="64" cy="252" r="92" fill="#ffffff" opacity="0.06" />
      <rect width="400" height="300" fill="url(#${hid})" />
      <circle cx="200" cy="130" r="80" fill="#ffffff" opacity="0.13" />
      <text x="200" y="146" text-anchor="middle" font-size="104"
            dominant-baseline="middle">${product.emoji}</text>
      <rect x="${badgeX}" y="232" width="${badgeW}" height="34" rx="17"
            fill="#0c2244" opacity="0.4" />
      <text x="200" y="250" text-anchor="middle" fill="#ffffff"
            font-family="Inter, system-ui, sans-serif" font-size="16" font-weight="700"
            dominant-baseline="middle" letter-spacing="0.3">${badge}</text>
    </svg>`;
}
