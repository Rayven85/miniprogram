import { getCart, setCart, clearCart, removeCartByKey, updateCartQtyByKey } from "../../utils/storage";
import { fenToYuan, calcLineTotal, sumFen } from "../../utils/money";
import { toast, toastSuccess } from "../../utils/ui";

Page({
  data: {
    items: [],
    count: 0,
    isEmpty: true,
    totalFee: 0,
    totalYuan: "0.00",
  },

  onShow() {
    this.refresh();
  },

  refresh() {
    const raw = getCart() || [];
    const items = raw.map((x) => this.enhanceCartItem(x));
    const totalFee = sumFen(items.map((x) => x.lineTotalFee));
    this.setData({
      items,
      count: items.reduce((s, x) => s + (x.qty || 0), 0),
      isEmpty: items.length === 0,
      totalFee,
      totalYuan: fenToYuan(totalFee),
    });
  },

  // 把 cart item 变成可直接展示的 UI 字段
  enhanceCartItem(x) {
    const qty = Math.max(1, Number(x.qty || 1));
    const unitPrice = Number(x.unitPrice || 0); // 分（基础价）
    const options = x.options || {};
    const addonFee = Number(x.addonFee || 0); // 如果你 addToCart 已经算过就用；否则这里可以不算

    // 如果你没存 addonFee，我们就保守：用 unitPrice 直接算（结算时再用云函数重算）
    const unitFee = unitPrice + addonFee;
    const lineTotalFee = calcLineTotal(unitFee, qty);

    return {
      ...x,
      qty,
      unitYuan: fenToYuan(unitFee),
      lineTotalFee,
      lineTotalYuan: fenToYuan(lineTotalFee),
      optionsText: buildOptionsText(options),
      imageUrl: x.imageUrl || "",
      key: x.key || x._id || `${x.productId}_${Math.random()}`,
    };
  },

  incQty(e) {
    const key = e.currentTarget.dataset.key;
    const item = this.data.items.find((x) => x.key === key);
    if (!item) return;

    const nextQty = item.qty + 1;
    updateCartQtyByKey(key, nextQty);
    this.refresh();
  },

  decQty(e) {
    const key = e.currentTarget.dataset.key;
    const item = this.data.items.find((x) => x.key === key);
    if (!item) return;

    const nextQty = Math.max(1, item.qty - 1);
    updateCartQtyByKey(key, nextQty);
    this.refresh();
  },

  removeOne(e) {
    const key = e.currentTarget.dataset.key;
    removeCartByKey(key);
    toastSuccess("已删除");
    this.refresh();
  },

  onClear() {
    wx.showModal({
      title: "清空购物车？",
      content: "清空后无法恢复",
      confirmText: "清空",
      success: (res) => {
        if (res.confirm) {
          clearCart();
          toastSuccess("已清空");
          this.refresh();
        }
      },
    });
  },

  goMenu() {
    wx.switchTab ? wx.switchTab({ url: "/pages/menu/menu" }) : wx.navigateTo({ url: "/pages/menu/menu" });
  },

  goCheckout() {
    if (this.data.isEmpty) return toast("购物车是空的");
    wx.navigateTo({ url: "/pages/checkout/checkout" });
  },
});

// 把选项转成一行可读文本（WXML 不做拼接）
function buildOptionsText(options) {
  const o = options || {};
  const parts = [];

  if (o.spice) parts.push(`辣度：${o.spice}`);
  if (o.cutlery) parts.push(`餐具：${o.cutlery === "NO" ? "不要" : "要"}`);

  if (Array.isArray(o.addons) && o.addons.length) parts.push(`加购：${o.addons.join("、")}`);
  if (Array.isArray(o.noIngredients) && o.noIngredients.length) parts.push(`不要：${o.noIngredients.join("、")}`);
  if (Array.isArray(o.remarkCodes) && o.remarkCodes.length) parts.push(`备注：${o.remarkCodes.join("、")}`);

  return parts.join("；");
}
