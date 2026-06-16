/**
 * Northgate Wholesale storefront — single-page app.
 *
 * A tiny hash router renders views into <main id="app">. The persistent header
 * (brand, nav, cart) lives in index.html and never re-renders, so the cart icon
 * and its count are visible on every screen.
 */

// ───────────────────────── helpers ─────────────────────────

const app = document.getElementById("app");
const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const money = (n) => usd.format(n);

// Light-weight, in-memory UI state.
const state = {
  catalogFilter: "All",
  lastOrder: null, // captured order summary for the confirmation screen
};

/** Escape values that originate from user input before injecting as HTML. */
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

/** Brief confirmation message that fades in/out. */
function toast(message) {
  let el = document.querySelector(".toast");
  if (!el) {
    el = document.createElement("div");
    el.className = "toast";
    el.setAttribute("role", "status");
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove("show"), 1900);
}

// ──────────────────── reusable components ───────────────────

/** A single product card used in the catalog grid and the featured row. */
function productCard(p) {
  return `
    <article class="product-card">
      <a class="card-media" href="#/product/${p.id}" aria-label="View ${escapeHtml(p.name)}">
        ${productImageSVG(p)}
        <span class="card-cat">${p.category}</span>
      </a>
      <div class="card-body">
        <a class="card-title" href="#/product/${p.id}">${p.name}</a>
        <p class="card-meta">${p.unitsPerCase} ${p.unitLabel} per case · ${money(unitPrice(p))}/unit</p>
        <div class="card-foot">
          <span class="card-price">${money(p.casePrice)}<span class="per">/case</span></span>
          <button class="btn btn-buy" data-action="add" data-id="${p.id}">Add to cart</button>
        </div>
      </div>
    </article>`;
}

/** Quantity stepper markup (used on product detail and in the cart). */
function stepper(id, qty, opts = {}) {
  const dec = opts.cart ? "cart-dec" : "qty-dec";
  const inc = opts.cart ? "cart-inc" : "qty-inc";
  const change = opts.cart ? "cart-qty" : "qty-input";
  return `
    <div class="stepper" data-id="${id}">
      <button class="step" data-action="${dec}" data-id="${id}" aria-label="Decrease quantity">−</button>
      <input class="step-input" type="number" min="1" value="${qty}"
             data-action="${change}" data-id="${id}" aria-label="Number of cases" />
      <button class="step" data-action="${inc}" data-id="${id}" aria-label="Increase quantity">+</button>
    </div>`;
}

// ───────────────────────── views ───────────────────────────

function homeView() {
  const heroTiles = ["cola-classic", "chocolate-bars", "olive-oil", "instant-coffee", "spring-water", "dish-soap"]
    .map((id, i) => `<div class="hero-tile t${i}">${productImageSVG(getProduct(id))}</div>`)
    .join("");

  const featured = PRODUCTS.slice(0, 5).map(productCard).join("");

  return `
    <section class="hero">
      <div class="container hero-inner">
        <div class="hero-copy">
          <span class="eyebrow">Wholesale distribution · Trade &amp; individuals welcome</span>
          <h1>Stock up by the case<br />at true wholesale prices.</h1>
          <p>Northgate Wholesale supplies beverages, snacks, pantry and household
             essentials by the full case. Browse the catalog, choose how many boxes
             you need, and check out online in minutes — no minimum account required.</p>
          <div class="hero-actions">
            <a class="btn btn-primary btn-lg" href="#/catalog">Shop the Catalog →</a>
            <a class="btn btn-ghost btn-lg" href="#featured">See popular products</a>
          </div>
          <ul class="hero-points">
            <li>✓ Sold by the case</li>
            <li>✓ Transparent per-unit pricing</li>
            <li>✓ Fast bulk delivery</li>
          </ul>
        </div>
        <div class="hero-art" aria-hidden="true">${heroTiles}</div>
      </div>
    </section>

    <section class="value-strip">
      <div class="container value-grid">
        <div class="value"><span class="value-ic">📦</span><h3>Buy by the case</h3><p>Every product ships as a full carton — clear case counts, no guesswork.</p></div>
        <div class="value"><span class="value-ic">🏷️</span><h3>Wholesale pricing</h3><p>Trade-level prices with the per-unit cost shown on every item.</p></div>
        <div class="value"><span class="value-ic">🚚</span><h3>Fast bulk delivery</h3><p>Pallet and parcel shipping built for restocking on schedule.</p></div>
        <div class="value"><span class="value-ic">🤝</span><h3>Business or personal</h3><p>Open to registered businesses and individual bulk buyers alike.</p></div>
      </div>
    </section>

    <section class="featured" id="featured">
      <div class="container">
        <div class="section-head">
          <div>
            <h2>Popular right now</h2>
            <p class="section-sub">A taste of the range — explore the full catalog for everything we stock.</p>
          </div>
          <a class="btn btn-outline" href="#/catalog">View full catalog →</a>
        </div>
        <div class="product-grid">${featured}</div>
        <div class="featured-cta">
          <a class="btn btn-primary btn-lg" href="#/catalog">Browse the full catalog →</a>
        </div>
      </div>
    </section>

    <section class="cta-band">
      <div class="container cta-inner">
        <div>
          <h2>Ready to stock up?</h2>
          <p>Fill a cart by the case and check out in minutes.</p>
        </div>
        <a class="btn btn-light btn-lg" href="#/catalog">Start an order →</a>
      </div>
    </section>`;
}

function catalogView() {
  const categories = ["All", "Beverages", "Snacks", "Pantry", "Household"];
  const filter = state.catalogFilter;
  const list = filter === "All" ? PRODUCTS : PRODUCTS.filter((p) => p.category === filter);

  const chips = categories
    .map((c) => `<button class="chip ${c === filter ? "is-active" : ""}" data-action="filter" data-cat="${c}">${c}</button>`)
    .join("");

  return `
    <section class="page">
      <div class="container">
        <header class="page-head">
          <div>
            <h1>Full Catalog</h1>
            <p class="section-sub">${list.length} product${list.length === 1 ? "" : "s"} · all prices are per case</p>
          </div>
          <a class="btn btn-outline" href="#/cart">View cart →</a>
        </header>
        <div class="filters" role="group" aria-label="Filter by category">${chips}</div>
        <div class="product-grid">${list.map(productCard).join("")}</div>
      </div>
    </section>`;
}

function productView(id) {
  const p = getProduct(id);
  if (!p) return notFoundView();

  const related = PRODUCTS.filter((x) => x.category === p.category && x.id !== p.id).slice(0, 5);

  return `
    <section class="page">
      <div class="container">
        <a class="back-link" href="#/catalog">← Back to catalog</a>
        <div class="product-detail">
          <div class="detail-media">${productImageSVG(p)}</div>
          <div class="detail-info">
            <span class="detail-cat">${p.category}</span>
            <h1>${p.name}</h1>
            <div class="detail-price">
              ${money(p.casePrice)} <span class="per">/ case</span>
              <span class="detail-unit-price">${money(unitPrice(p))} per ${p.unitLabel.replace(/s$/, "")}</span>
            </div>

            <div class="case-callout">
              <span class="case-ic" aria-hidden="true">📦</span>
              <div>
                <strong>Each case contains ${p.unitsPerCase} ${p.unitLabel}.</strong>
                <span>You're buying full cases — choose how many boxes you need below.</span>
              </div>
            </div>

            <p class="detail-desc">${p.description}</p>

            <div class="buy-box">
              <label class="buy-label">Cases to buy</label>
              <div class="buy-row">
                ${stepper(p.id, 1)}
                <button class="btn btn-primary btn-lg" data-action="add-detail" data-id="${p.id}">Add to cart</button>
              </div>
              <p class="buy-summary">
                <span id="detail-units">${p.unitsPerCase} ${p.unitLabel} total</span>
                · <strong id="detail-subtotal">${money(p.casePrice)}</strong>
              </p>
            </div>
          </div>
        </div>

        ${related.length ? `
          <div class="related">
            <h2>More in ${p.category}</h2>
            <div class="product-grid">${related.map(productCard).join("")}</div>
          </div>` : ""}
      </div>
    </section>`;
}

function cartView() {
  const items = Cart.detailedItems();

  if (!items.length) {
    return `
      <section class="page">
        <div class="container">
          <h1>Your cart</h1>
          <div class="empty-state">
            <span class="empty-ic">🛒</span>
            <h2>Your cart is empty</h2>
            <p>Browse the catalog and add a few cases to get started.</p>
            <a class="btn btn-primary btn-lg" href="#/catalog">Browse the catalog →</a>
          </div>
        </div>
      </section>`;
  }

  const rows = items.map((i) => `
    <div class="cart-row">
      <a class="cart-thumb" href="#/product/${i.product.id}">${productImageSVG(i.product)}</a>
      <div class="cart-row-main">
        <a class="cart-row-title" href="#/product/${i.product.id}">${i.product.name}</a>
        <p class="cart-row-meta">${i.product.unitsPerCase} ${i.product.unitLabel} per case · ${money(i.product.casePrice)}/case</p>
        <button class="link-danger" data-action="cart-remove" data-id="${i.product.id}">Remove</button>
      </div>
      <div class="cart-row-qty">${stepper(i.product.id, i.qty, { cart: true })}</div>
      <div class="cart-row-total">${money(i.lineTotal)}</div>
    </div>`).join("");

  const subtotal = Cart.subtotal();

  return `
    <section class="page">
      <div class="container cart-layout">
        <div class="cart-main">
          <h1>Your cart</h1>
          <div class="cart-list">${rows}</div>
          <a class="back-link" href="#/catalog">← Continue shopping</a>
        </div>
        <aside class="cart-summary">
          <h2>Order summary</h2>
          <div class="sum-row"><span>Subtotal (${Cart.count()} case${Cart.count() === 1 ? "" : "s"})</span><span>${money(subtotal)}</span></div>
          <div class="sum-row muted"><span>Shipping</span><span>Calculated at checkout</span></div>
          <div class="sum-row muted"><span>Tax</span><span>Calculated at checkout</span></div>
          <div class="sum-row total"><span>Estimated total</span><span>${money(subtotal)}</span></div>
          <a class="btn btn-primary btn-lg btn-block" href="#/checkout">Proceed to checkout →</a>
          <p class="secure-note">🔒 Secure checkout · demo storefront</p>
        </aside>
      </div>
    </section>`;
}

function checkoutView() {
  const items = Cart.detailedItems();
  if (!items.length) {
    location.hash = "#/cart";
    return "";
  }

  const summary = items.map((i) => `
    <div class="co-line">
      <span>${i.qty} × ${i.product.name}</span>
      <span>${money(i.lineTotal)}</span>
    </div>`).join("");
  const subtotal = Cart.subtotal();

  return `
    <section class="page">
      <div class="container">
        <a class="back-link" href="#/cart">← Back to cart</a>
        <h1>Checkout</h1>
        <form id="checkout-form" class="checkout-layout" novalidate>
          <div class="checkout-fields">
            <fieldset>
              <legend>Account &amp; contact</legend>
              <div class="field"><label>Company name <span class="opt">(optional)</span></label><input name="company" autocomplete="organization" placeholder="For business / trade orders" /></div>
              <div class="grid-2">
                <div class="field"><label>Contact name *</label><input name="name" required autocomplete="name" /></div>
                <div class="field"><label>Phone *</label><input name="phone" required autocomplete="tel" inputmode="tel" /></div>
              </div>
              <div class="field"><label>Email *</label><input name="email" type="email" required autocomplete="email" /></div>
            </fieldset>

            <fieldset>
              <legend>Shipping address</legend>
              <div class="field"><label>Street address *</label><input name="address" required autocomplete="address-line1" /></div>
              <div class="grid-3">
                <div class="field"><label>City *</label><input name="city" required autocomplete="address-level2" /></div>
                <div class="field"><label>State *</label><input name="region" required autocomplete="address-level1" /></div>
                <div class="field"><label>ZIP *</label><input name="zip" required autocomplete="postal-code" inputmode="numeric" /></div>
              </div>
            </fieldset>

            <fieldset>
              <legend>Payment</legend>
              <p class="demo-note">Demo only — do not enter real card details. No payment is processed.</p>
              <div class="field"><label>Name on card *</label><input name="cardname" required autocomplete="cc-name" /></div>
              <div class="field"><label>Card number *</label><input name="cardnumber" required inputmode="numeric" placeholder="4242 4242 4242 4242" autocomplete="cc-number" /></div>
              <div class="grid-2">
                <div class="field"><label>Expiry *</label><input name="expiry" required placeholder="MM/YY" autocomplete="cc-exp" /></div>
                <div class="field"><label>CVC *</label><input name="cvc" required inputmode="numeric" placeholder="123" autocomplete="cc-csc" /></div>
              </div>
            </fieldset>
          </div>

          <aside class="checkout-summary">
            <h2>Order summary</h2>
            <div class="co-lines">${summary}</div>
            <div class="sum-row"><span>Subtotal</span><span>${money(subtotal)}</span></div>
            <div class="sum-row muted"><span>Shipping</span><span>Free over 10 cases</span></div>
            <div class="sum-row total"><span>Total due</span><span>${money(subtotal)}</span></div>
            <button type="submit" class="btn btn-primary btn-lg btn-block">Place order · ${money(subtotal)}</button>
            <p class="secure-note">🔒 Your details are not stored — demo checkout.</p>
          </aside>
        </form>
      </div>
    </section>`;
}

function confirmationView() {
  const order = state.lastOrder;
  if (!order) {
    return `
      <section class="page">
        <div class="container">
          <div class="empty-state">
            <span class="empty-ic">📭</span>
            <h2>No recent order</h2>
            <p>Head to the catalog to start a new order.</p>
            <a class="btn btn-primary btn-lg" href="#/catalog">Browse the catalog →</a>
          </div>
        </div>
      </section>`;
  }

  const lines = order.items.map((i) => `
    <div class="co-line"><span>${i.qty} × ${escapeHtml(i.name)}</span><span>${money(i.lineTotal)}</span></div>`).join("");

  return `
    <section class="page">
      <div class="container confirm">
        <div class="confirm-badge">✓</div>
        <h1>Thank you, ${escapeHtml(order.name)}!</h1>
        <p class="confirm-lead">Your order has been placed. A confirmation has been sent to
           <strong>${escapeHtml(order.email)}</strong>.</p>
        <div class="confirm-card">
          <div class="confirm-row"><span>Order number</span><strong>${order.number}</strong></div>
          <div class="confirm-row"><span>Order date</span><span>${order.date}</span></div>
          <div class="co-lines">${lines}</div>
          <div class="sum-row total"><span>Total paid</span><span>${money(order.subtotal)}</span></div>
        </div>
        <a class="btn btn-primary btn-lg" href="#/catalog">Continue shopping →</a>
      </div>
    </section>`;
}

function notFoundView() {
  return `
    <section class="page">
      <div class="container empty-state">
        <span class="empty-ic">🔍</span>
        <h2>Page not found</h2>
        <a class="btn btn-primary btn-lg" href="#/catalog">Go to catalog →</a>
      </div>
    </section>`;
}

// ───────────────────────── router ──────────────────────────

function currentRoute() {
  const hash = location.hash.replace(/^#/, "") || "/";
  const parts = hash.split("/").filter(Boolean); // ["product","cola"] etc.
  return { name: parts[0] || "home", param: parts[1] };
}

function renderApp() {
  const { name, param } = currentRoute();
  let html;
  switch (name) {
    case "home":       html = homeView(); break;
    case "catalog":    html = catalogView(); break;
    case "product":    html = productView(param); break;
    case "cart":       html = cartView(); break;
    case "checkout":   html = checkoutView(); break;
    case "confirmation": html = confirmationView(); break;
    default:           html = notFoundView();
  }
  app.innerHTML = html;

  // Reflect the active section in the header nav.
  const navKey = name === "home" ? "home" : name === "catalog" ? "catalog" : "";
  document.querySelectorAll(".main-nav a").forEach((a) => {
    a.classList.toggle("is-active", a.dataset.nav === navKey);
  });

  // Support in-page anchors like #featured on the home view.
  if (name === "featured" || location.hash === "#featured") {
    document.getElementById("featured")?.scrollIntoView({ behavior: "smooth" });
  }

  updateCartBadge();
}

// ─────────────────── cart badge + events ───────────────────

function updateCartBadge() {
  const badge = document.getElementById("cart-count");
  const count = Cart.count();
  badge.textContent = count;
  badge.dataset.empty = count === 0 ? "true" : "false";
}

/** Recompute the live totals on the product detail page. */
function updateDetailTotals(product) {
  const input = document.querySelector('.buy-box .step-input');
  if (!input) return;
  const qty = Math.max(1, parseInt(input.value, 10) || 1);
  const units = document.getElementById("detail-units");
  const sub = document.getElementById("detail-subtotal");
  if (units) units.textContent = `${qty * product.unitsPerCase} ${product.unitLabel} total`;
  if (sub) sub.textContent = money(qty * product.casePrice);
}

// Delegated click handling for every interactive control.
document.addEventListener("click", (e) => {
  const el = e.target.closest("[data-action]");
  if (!el) return;
  const { action, id, cat } = el.dataset;

  switch (action) {
    case "add": // "Add to cart" on a product card
      Cart.add(id, 1);
      toast("Added 1 case to your cart");
      break;

    case "filter":
      state.catalogFilter = cat;
      renderApp();
      break;

    case "qty-dec":
    case "qty-inc": {
      const input = document.querySelector('.buy-box .step-input');
      let v = parseInt(input.value, 10) || 1;
      v = action === "qty-inc" ? v + 1 : Math.max(1, v - 1);
      input.value = v;
      updateDetailTotals(getProduct(id));
      break;
    }

    case "add-detail": {
      const input = document.querySelector('.buy-box .step-input');
      const qty = Math.max(1, parseInt(input.value, 10) || 1);
      Cart.add(id, qty);
      toast(`Added ${qty} case${qty === 1 ? "" : "s"} to your cart`);
      break;
    }

    case "cart-dec":
    case "cart-inc": {
      const line = Cart.read().find((i) => i.id === id);
      const current = line ? line.qty : 1;
      Cart.setQty(id, action === "cart-inc" ? current + 1 : current - 1);
      renderApp();
      break;
    }

    case "cart-remove":
      Cart.remove(id);
      toast("Item removed");
      renderApp();
      break;
  }
});

// Quantity typed directly into a number input.
document.addEventListener("change", (e) => {
  const el = e.target.closest("[data-action]");
  if (!el) return;
  const { action, id } = el.dataset;

  if (action === "qty-input") {
    if (parseInt(el.value, 10) < 1 || isNaN(parseInt(el.value, 10))) el.value = 1;
    updateDetailTotals(getProduct(id));
  } else if (action === "cart-qty") {
    Cart.setQty(id, parseInt(el.value, 10) || 1);
    renderApp();
  }
});

// Checkout submission → build an order, clear the cart, show confirmation.
document.addEventListener("submit", (e) => {
  if (e.target.id !== "checkout-form") return;
  e.preventDefault();

  if (!e.target.checkValidity()) {
    e.target.reportValidity();
    return;
  }

  const data = new FormData(e.target);
  const items = Cart.detailedItems().map((i) => ({
    name: i.product.name,
    qty: i.qty,
    lineTotal: i.lineTotal,
  }));

  state.lastOrder = {
    number: "NW-" + Date.now().toString(36).toUpperCase().slice(-6) + "-" + Math.floor(Math.random() * 900 + 100),
    date: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
    name: data.get("name"),
    email: data.get("email"),
    items,
    subtotal: Cart.subtotal(),
  };

  Cart.clear();
  location.hash = "#/confirmation";
});

// Keep the header badge in sync whenever the cart changes.
document.addEventListener("cart:change", () => {
  updateCartBadge();
  const btn = document.querySelector(".cart-button");
  btn.classList.remove("bump");
  void btn.offsetWidth; // restart the animation
  btn.classList.add("bump");
});

// ───────────────────────── boot ────────────────────────────

window.addEventListener("hashchange", () => {
  window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  renderApp();
});

document.getElementById("year").textContent = new Date().getFullYear();
renderApp();
