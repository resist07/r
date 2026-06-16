/**
 * Shopping cart for Northgate Wholesale.
 *
 * The cart stores a simple list of { id, qty } where `qty` is the number of
 * CASES (boxes) of that product. It persists to localStorage so a buyer's
 * basket survives page reloads, and broadcasts changes so the header badge and
 * any open view stay in sync.
 */
const Cart = {
  KEY: "northgate_cart_v1",

  /** Read the raw cart list from storage. */
  read() {
    try {
      return JSON.parse(localStorage.getItem(this.KEY)) || [];
    } catch {
      return [];
    }
  },

  /** Persist the cart and notify listeners. */
  write(items) {
    localStorage.setItem(this.KEY, JSON.stringify(items));
    document.dispatchEvent(new CustomEvent("cart:change"));
  },

  /** Add `qty` cases of a product (merging with any existing line). */
  add(id, qty = 1) {
    qty = Math.max(1, Math.floor(qty));
    const items = this.read();
    const line = items.find((i) => i.id === id);
    if (line) {
      line.qty += qty;
    } else {
      items.push({ id, qty });
    }
    this.write(items);
  },

  /** Set the exact case quantity for a line (removing it when it hits 0). */
  setQty(id, qty) {
    qty = Math.floor(qty);
    let items = this.read();
    if (qty <= 0) {
      items = items.filter((i) => i.id !== id);
    } else {
      const line = items.find((i) => i.id === id);
      if (line) line.qty = qty;
    }
    this.write(items);
  },

  /** Remove a line entirely. */
  remove(id) {
    this.write(this.read().filter((i) => i.id !== id));
  },

  /** Empty the cart (used after a successful order). */
  clear() {
    this.write([]);
  },

  /**
   * Cart contents joined with product data and per-line totals.
   * Skips any stored ids that no longer exist in the catalog.
   */
  detailedItems() {
    return this.read()
      .map((line) => {
        const product = getProduct(line.id);
        if (!product) return null;
        return { ...line, product, lineTotal: product.casePrice * line.qty };
      })
      .filter(Boolean);
  },

  /** Total number of cases across the whole cart (for the header badge). */
  count() {
    return this.read().reduce((sum, i) => sum + i.qty, 0);
  },

  /** Order subtotal in dollars. */
  subtotal() {
    return this.detailedItems().reduce((sum, i) => sum + i.lineTotal, 0);
  },
};
