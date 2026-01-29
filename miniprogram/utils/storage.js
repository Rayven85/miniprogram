// utils/storage.js
// 购物车统一存到本地 storage，避免页面间传来传去
// 结构建议：cart = { items: CartItem[], updatedAt: number }

const CART_KEY = "ORDER_CART_V1";

export function getCart() {
  const data = wx.getStorageSync(CART_KEY);
  if (!data || typeof data !== "object") return { items: [], updatedAt: Date.now() };
  if (!Array.isArray(data.items)) data.items = [];
  return data;
}

export function setCart(cart) {
  const c = cart && typeof cart === "object" ? cart : { items: [] };
  c.updatedAt = Date.now();
  wx.setStorageSync(CART_KEY, c);
  return c;
}

export function clearCart() {
  wx.removeStorageSync(CART_KEY);
  return { items: [], updatedAt: Date.now() };
}

// 用于把“同一菜品 + 同一组选项”合并到一行
// item 里必须带 productId + options
export function buildCartKey(productId, options) {
  // 选项要稳定排序，否则同样内容会产生不同 key
  const stable = normalizeOptions(options);
  return `${productId}__${JSON.stringify(stable)}`;
}

export function normalizeOptions(options) {
  const o = options && typeof options === "object" ? options : {};
  const norm = {
    spice: String(o.spice ?? ""),
    cutlery: String(o.cutlery ?? ""), // YES/NO
    remarkCodes: Array.isArray(o.remarkCodes) ? [...o.remarkCodes].map(String).sort() : [],
    templateId: String(o.templateId ?? ""),
    addons: Array.isArray(o.addons) ? [...o.addons].map(String).sort() : [],
    noIngredients: Array.isArray(o.noIngredients) ? [...o.noIngredients].map(String).sort() : [],
  };
  return norm;
}


// 添加到购物车：如果同 key 已存在，就 qty 累加
export function addToCart(payload) {
  // payload: { productId, name, unitPrice, qty, imageUrl?, options }
  const cart = getCart();
  const normOpt = normalizeOptions(payload.options);
  const key = buildCartKey(payload.productId, normOpt);

  const idx = cart.items.findIndex(it => it.key === key);
  const addQty = Math.max(1, Math.floor(Number(payload.qty) || 1));
  if (idx >= 0) {
    cart.items[idx].qty += addQty;
  } else {
    cart.items.push({
      key,
      productId: payload.productId,
      name: payload.name,
      unitPrice: payload.unitPrice, // 分
      addonFee: Number(payload.addonFee || 0), // 分
      optionsLabel: payload.optionsLabel || null,       // 中文展示用（对象）
      imageUrl: payload.imageUrl || "",
      qty: addQty,
      options: normOpt,
      createdAt: Date.now(),
    });
  }
  return setCart(cart);
}

export function updateCartItemQty(key, qty) {
  const cart = getCart();
  const idx = cart.items.findIndex(it => it.key === key);
  if (idx < 0) return cart;

  const q = Number(qty);
  if (!Number.isFinite(q) || q <= 0) {
    // qty<=0 就删除
    cart.items.splice(idx, 1);
  } else {
    cart.items[idx].qty = Math.floor(q);
  }
  return setCart(cart);
}

export function removeCartItem(key) {
  const cart = getCart();
  cart.items = cart.items.filter(it => it.key !== key);
  return setCart(cart);
}

export function getCartItems() {
  return getCart().items || [];
}

export function setCartItems(items) {
  return setCart({ items: Array.isArray(items) ? items : [] });
}

