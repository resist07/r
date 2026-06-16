const products = [
  // Beverages
  { id: 1, name: "Premium Coffee Beans", emoji: "☕", color: "linear-gradient(135deg,#3b1a08,#92400e)", price: 89.99, cartonQty: 24, unit: "1kg bags per carton", category: "Beverages", description: "Premium single-origin arabica coffee beans from Colombia. Rich chocolate and caramel notes with a smooth, full-bodied finish. Ideal for cafes, restaurants, and office kitchens seeking consistent wholesale quality at unbeatable prices." },
  { id: 2, name: "Natural Spring Water", emoji: "💧", color: "linear-gradient(135deg,#0369a1,#38bdf8)", price: 28.00, cartonQty: 24, unit: "500ml bottles per carton", category: "Beverages", description: "Crystal-clear natural spring water sourced from pristine mountain aquifers. No additives, no fluoride — just pure hydration. Perfect for hotels, offices, events, and retail resale." },
  { id: 3, name: "Organic Green Tea", emoji: "🍵", color: "linear-gradient(135deg,#14532d,#4ade80)", price: 52.00, cartonQty: 48, unit: "tea bags per carton", category: "Beverages", description: "Premium certified-organic green tea bags from farms in Japan and China. Light, refreshing flavor naturally rich in antioxidants. A bestseller for health-conscious cafes, spas, and wellness retailers." },
  { id: 4, name: "Fresh Orange Juice", emoji: "🍊", color: "linear-gradient(135deg,#9a3412,#f97316)", price: 96.00, cartonQty: 12, unit: "1L cartons per case", category: "Beverages", description: "100% pure squeezed orange juice — no added sugar, no concentrate, no artificial flavors. Cold-pressed and chilled within hours of pressing. An essential breakfast staple for hotels, restaurants, and cafes." },
  { id: 5, name: "Sparkling Mineral Water", emoji: "🫧", color: "linear-gradient(135deg,#1d4ed8,#93c5fd)", price: 36.00, cartonQty: 24, unit: "330ml cans per carton", category: "Beverages", description: "Premium sparkling mineral water with natural carbonation sourced from an artesian spring. Clean and crisp with no artificial flavors. The sophisticated table water of choice for restaurants, hotels, and bars." },

  // Pantry
  { id: 6, name: "Extra Virgin Olive Oil", emoji: "🫒", color: "linear-gradient(135deg,#365314,#86efac)", price: 210.00, cartonQty: 12, unit: "1L bottles per carton", category: "Pantry", description: "Cold-pressed extra virgin olive oil from Mediterranean groves in Spain and Italy. First-press quality with under 0.3% acidity. A cornerstone product for any restaurant kitchen, catering company, or gourmet food retailer." },
  { id: 7, name: "Jasmine Rice", emoji: "🍚", color: "linear-gradient(135deg,#57534e,#d6d3d1)", price: 95.00, cartonQty: 10, unit: "2kg bags per carton", category: "Pantry", description: "Fragrant long-grain jasmine rice from Thailand, Grade A export quality. Fluffy and aromatic after cooking with a delicate floral note. A high-turnover essential for Asian cuisine restaurants and catering services." },
  { id: 8, name: "Raw Honey", emoji: "🍯", color: "linear-gradient(135deg,#92400e,#fbbf24)", price: 130.00, cartonQty: 12, unit: "500g jars per carton", category: "Pantry", description: "Pure unfiltered raw honey from free-range beehives. Rich in natural enzymes and antioxidants. Crystallizes naturally — always a sign of authentic quality. Ideal for health food stores, specialty retailers, and bakeries." },
  { id: 9, name: "Diced Tomatoes", emoji: "🍅", color: "linear-gradient(135deg,#991b1b,#f87171)", price: 38.00, cartonQty: 24, unit: "400g cans per carton", category: "Pantry", description: "Vine-ripened tomatoes hand-selected and diced at peak ripeness. No added sugar or artificial preservatives. The versatile foundation for countless restaurant sauces, soups, stews, and pasta dishes." },
  { id: 10, name: "Black Beans", emoji: "🫘", color: "linear-gradient(135deg,#1c1917,#57534e)", price: 32.00, cartonQty: 24, unit: "400g cans per carton", category: "Pantry", description: "Tender cooked black beans packed in a light brine — ready to use with no soaking required. High in plant protein and fiber. An essential ingredient for Mexican, Caribbean, and South American cuisine." },

  // Snacks
  { id: 11, name: "Protein Bars (Assorted)", emoji: "💪", color: "linear-gradient(135deg,#5b21b6,#c4b5fd)", price: 145.00, cartonQty: 48, unit: "bars per carton", category: "Snacks", description: "High-performance nutrition bars in three flavors: Chocolate Fudge, Peanut Butter Crunch, and Vanilla Almond. Each bar delivers 20g of protein. A top seller for gyms, sports centers, health food stores, and vending operators." },
  { id: 12, name: "Mixed Premium Nuts", emoji: "🥜", color: "linear-gradient(135deg,#78350f,#d97706)", price: 115.00, cartonQty: 12, unit: "500g bags per carton", category: "Snacks", description: "An artisan blend of cashews, almonds, walnuts, Brazil nuts, and macadamias. Dry-roasted with a light touch of sea salt. No artificial additives or fillers. Popular for gift shops, airlines, hotel minibars, and specialty food retailers." },
  { id: 13, name: "Whole Grain Crackers", emoji: "🌾", color: "linear-gradient(135deg,#7c2d12,#d4a574)", price: 72.00, cartonQty: 24, unit: "150g boxes per carton", category: "Snacks", description: "Crunchy multigrain crackers baked with sesame, quinoa, and sunflower seeds. No artificial flavors or colors. Versatile for cheese boards, dips, and everyday snacking — a crowd-pleasing retail staple." },
  { id: 14, name: "Dark Chocolate Bars", emoji: "🍫", color: "linear-gradient(135deg,#1c0a00,#92400e)", price: 88.00, cartonQty: 24, unit: "100g bars per carton", category: "Snacks", description: "70% single-origin dark chocolate bars made with cacao from Ecuador. Rich, intense flavor with a silky smooth finish. Certified organic and fair-trade. A premium product for confectioneries, gift shops, and gourmet retailers." },

  // Cooking
  { id: 15, name: "Canola Oil", emoji: "🫙", color: "linear-gradient(135deg,#a16207,#fde047)", price: 65.00, cartonQty: 12, unit: "2L bottles per carton", category: "Cooking", description: "High smoke-point refined canola oil ideal for commercial frying, baking, and sautéing. Light neutral flavor that enhances dishes without overpowering. The economical, high-volume choice for professional kitchens." },
  { id: 16, name: "Coconut Milk", emoji: "🥥", color: "linear-gradient(135deg,#065f46,#6ee7b7)", price: 54.00, cartonQty: 24, unit: "400ml cans per carton", category: "Cooking", description: "Rich full-fat coconut milk from Sri Lankan coconuts with no artificial thickeners or stabilizers. Creamy texture ideal for Thai curries, Indian gravies, and dairy-free desserts. A must-stock for Asian cuisine and health food stores." },
  { id: 17, name: "Apple Cider Vinegar", emoji: "🍎", color: "linear-gradient(135deg,#7f1d1d,#fca5a5)", price: 78.00, cartonQty: 12, unit: "1L bottles per carton", category: "Cooking", description: "Raw unfiltered apple cider vinegar with the mother culture intact. Tangy and complex — ideal for salad dressings, marinades, pickling, and wellness drinks. Growing demand from health-conscious consumers and specialty retailers." },
  { id: 18, name: "Dark Soy Sauce", emoji: "🥢", color: "linear-gradient(135deg,#0c0a09,#44403c)", price: 58.00, cartonQty: 12, unit: "1L bottles per carton", category: "Cooking", description: "Traditionally brewed dark soy sauce aged for 180 days. Deep umami flavor, less salty than light varieties with a rich color. An essential staple for Chinese, Thai, and pan-Asian cooking. High-turnover for Asian restaurants." },

  // Baking
  { id: 19, name: "All-Purpose Flour", emoji: "🌾", color: "linear-gradient(135deg,#b45309,#fef3c7)", price: 42.00, cartonQty: 12, unit: "1kg bags per carton", category: "Baking", description: "Premium wheat flour milled to a fine, consistent texture. Bleached and enriched for reliable performance across all baking applications. Trusted by commercial bakeries for bread, pastries, cakes, and pasta production." },
  { id: 20, name: "Rolled Oats", emoji: "🥣", color: "linear-gradient(135deg,#78350f,#fbbf24)", price: 38.00, cartonQty: 20, unit: "1kg bags per carton", category: "Baking", description: "Whole grain rolled oats, gently steamed and flattened for a creamy, satisfying texture. Excellent for porridge, granola, muesli, and baked goods. A staple high-volume ingredient for cafes, meal prep services, and health food stores." },
];

// ── Cart ──────────────────────────────────────────
function getCart() {
  return JSON.parse(localStorage.getItem('wh_cart') || '[]');
}
function saveCart(cart) {
  localStorage.setItem('wh_cart', JSON.stringify(cart));
  refreshBadge();
}
function refreshBadge() {
  const total = getCart().reduce((s, i) => s + i.qty, 0);
  document.querySelectorAll('.badge').forEach(el => {
    el.textContent = total;
    el.classList.toggle('on', total > 0);
  });
}
function addToCart(id, qty) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  const cart = getCart();
  const ex = cart.find(x => x.id === id);
  if (ex) { ex.qty += qty; } else {
    cart.push({ id: p.id, name: p.name, emoji: p.emoji, color: p.color, price: p.price, cartonQty: p.cartonQty, unit: p.unit, qty });
  }
  saveCart(cart);
  showToast(`✓  ${qty} carton${qty > 1 ? 's' : ''} of "${p.name}" added to cart`);
}

// ── Toast ─────────────────────────────────────────
let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  clearTimeout(toastTimer);
  t.textContent = msg;
  t.classList.add('show');
  toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
}

// ── Modal ─────────────────────────────────────────
let currentProductId = null;
function openModal(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  currentProductId = id;
  const el = s => document.getElementById(s);
  el('mFace').style.background = p.color;
  el('mEmoji').textContent = p.emoji;
  el('mCat').textContent = p.category;
  el('mName').textContent = p.name;
  el('mDesc').textContent = p.description;
  el('mCarton').textContent = p.cartonQty + ' ' + p.unit;
  el('mPrice').textContent = '$' + p.price.toFixed(2);
  el('mQty').value = 1;
  el('modalOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
  document.body.style.overflow = '';
  currentProductId = null;
}

// ── Product Card HTML ─────────────────────────────
function cardHTML(p) {
  return `
    <div class="product-card">
      <div class="product-thumb" onclick="openModal(${p.id})">
        <div class="product-face" style="background:${p.color}">
          <span>${p.emoji}</span>
        </div>
        <div class="product-overlay"><span>Quick View</span></div>
        <span class="product-cat">${p.category}</span>
      </div>
      <div class="product-body">
        <div class="product-name">${p.name}</div>
        <div class="product-qty">${p.cartonQty} ${p.unit}</div>
        <div class="product-price-row">
          <span class="product-price">$${p.price.toFixed(2)}</span>
          <span class="product-per">/ carton</span>
        </div>
        <button class="product-buy" onclick="openModal(${p.id})">Buy Now</button>
      </div>
    </div>`;
}

// ── Cart Page ─────────────────────────────────────
function renderCart() {
  const main = document.getElementById('cartMain');
  const aside = document.getElementById('cartAside');
  if (!main) return;
  const cart = getCart();
  if (cart.length === 0) {
    main.innerHTML = `<div class="empty-cart">
      <div class="empty-icon">🛒</div>
      <h3>Your cart is empty</h3>
      <p>Browse our catalog and add products to get started.</p>
      <a href="catalog.html" class="btn btn-primary">Browse Catalog</a>
    </div>`;
    if (aside) aside.style.display = 'none';
    return;
  }
  if (aside) aside.style.display = 'block';
  main.innerHTML = cart.map(item => `
    <div class="cart-item" id="ci${item.id}">
      <div class="cart-thumb" style="background:${item.color}">${item.emoji}</div>
      <div class="cart-info">
        <div class="cart-name">${item.name}</div>
        <div class="cart-sub">${item.cartonQty} ${item.unit}</div>
        <div class="cart-qty-row">
          <button class="cqb" onclick="cqChange(${item.id},-1)">−</button>
          <span class="cq-val">${item.qty}</span>
          <button class="cqb" onclick="cqChange(${item.id},1)">+</button>
        </div>
      </div>
      <div class="cart-right">
        <span class="cart-item-total">$${(item.price * item.qty).toFixed(2)}</span>
        <button class="cart-remove" onclick="cartRemove(${item.id})">✕ Remove</button>
      </div>
    </div>`).join('');

  const sub = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const ship = sub >= 500 ? 0 : 29.95;
  const total = sub + ship;
  document.getElementById('sumSub').textContent = '$' + sub.toFixed(2);
  document.getElementById('sumShip').textContent = ship === 0 ? 'FREE' : '$' + ship.toFixed(2);
  document.getElementById('sumTotal').textContent = '$' + total.toFixed(2);
}
function cqChange(id, d) {
  const cart = getCart();
  const item = cart.find(x => x.id === id);
  if (!item) return;
  item.qty = Math.max(1, item.qty + d);
  saveCart(cart);
  renderCart();
}
function cartRemove(id) {
  saveCart(getCart().filter(x => x.id !== id));
  renderCart();
}

// ── Checkout ──────────────────────────────────────
function openCheckout() {
  if (getCart().length === 0) return;
  document.getElementById('checkoutOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeCheckout() {
  document.getElementById('checkoutOverlay').classList.remove('open');
  document.body.style.overflow = '';
}
function submitOrder(e) {
  e.preventDefault();
  const form = document.getElementById('orderForm');
  const cm = document.getElementById('checkoutModal');
  cm.innerHTML = `
    <div class="success-modal">
      <div class="success-icon">✅</div>
      <h2>Order Confirmed!</h2>
      <p>Thank you for your order. Our team will review your order and send a confirmation to your email within the hour. Delivery typically takes 2–5 business days.</p>
      <button class="btn btn-primary btn-lg" style="margin:0 auto" onclick="closeCheckout();location.reload()">Continue Shopping</button>
    </div>`;
  saveCart([]);
}

// ── Catalog Filters ───────────────────────────────
function filterProducts(cat) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.toggle('active', b.dataset.cat === cat));
  const list = cat === 'All' ? products : products.filter(p => p.category === cat);
  const grid = document.getElementById('catalogGrid');
  if (grid) grid.innerHTML = list.map(cardHTML).join('');
}

// ── Init ──────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  refreshBadge();

  // Homepage featured row
  const fp = document.getElementById('featuredGrid');
  if (fp) fp.innerHTML = products.slice(0, 5).map(cardHTML).join('');

  // Catalog full grid
  const cg = document.getElementById('catalogGrid');
  if (cg) cg.innerHTML = products.map(cardHTML).join('');

  // Cart
  renderCart();

  // Modal
  const overlay = document.getElementById('modalOverlay');
  if (overlay) {
    overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
    document.getElementById('qtyMinus').addEventListener('click', () => {
      const i = document.getElementById('mQty');
      i.value = Math.max(1, +i.value - 1);
    });
    document.getElementById('qtyPlus').addEventListener('click', () => {
      const i = document.getElementById('mQty');
      i.value = +i.value + 1;
    });
    document.getElementById('modalAddBtn').addEventListener('click', () => {
      const qty = Math.max(1, parseInt(document.getElementById('mQty').value) || 1);
      addToCart(currentProductId, qty);
      closeModal();
    });
  }

  // Checkout overlay
  const co = document.getElementById('checkoutOverlay');
  if (co) {
    co.addEventListener('click', e => { if (e.target === co) closeCheckout(); });
    const form = document.getElementById('orderForm');
    if (form) form.addEventListener('submit', submitOrder);
  }

  // Keyboard close
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeModal(); closeCheckout(); }
  });
});
