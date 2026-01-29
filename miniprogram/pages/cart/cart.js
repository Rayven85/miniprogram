import { getCart, clearCart, removeCartItem, updateCartItemQty } from "../../utils/storage";
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
    const cart = getCart();
    const rawItems = cart.items || [];

    const items = rawItems.map((x) => this.enhanceCartItem(x));
    const totalFee = sumFen(items.map((x) => x.lineTotalFee));

    this.setData({
      items,
      count: items.reduce((s, x) => s + (x.qty || 0), 0),
      isEmpty: items.length === 0,
      totalFee,
      totalYuan: fenToYuan(totalFee),
    });
  },

  enhanceCartItem(x) {
    const qty = Math.max(1, Number(x.qty || 1));
    const unitPrice = Number(x.unitPrice || 0); // 分
    const addonFee = Number(x.addonFee || 0);   // 分（你后面会存）
    const unitFee = unitPrice + addonFee;
    const lineTotalFee = calcLineTotal(unitFee, qty);

    return {
      ...x,
      qty,
      unitYuan: fenToYuan(unitFee),
      lineTotalFee,
      lineTotalYuan: fenToYuan(lineTotalFee),
      optionsText: buildOptionsText(x),
      imageUrl: x.imageUrl || "",
      key: x.key, // 你 storage 已经保证有 key
    };
  },

  incQty(e) {
    const key = e.currentTarget.dataset.key;
    const item = this.data.items.find((x) => x.key === key);
    if (!item) return;

    updateCartItemQty(key, item.qty + 1);
    this.refresh();
  },

  decQty(e) {
    const key = e.currentTarget.dataset.key;
    const item = this.data.items.find((x) => x.key === key);
    if (!item) return;

    updateCartItemQty(key, Math.max(1, item.qty - 1));
    this.refresh();
  },

  removeOne(e) {
    const key = e.currentTarget.dataset.key;
    removeCartItem(key); // ✅
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
    wx.switchTab({
      url: "/pages/menu/menu",
      fail: () => {
        wx.navigateTo({ url: "/pages/menu/menu" });
      },
    });
  },

  goCheckout() {
    if (this.data.isEmpty) return toast("购物车是空的");
    wx.navigateTo({ url: "/pages/checkout/checkout" });
  },
});

function buildOptionsText(item) {
  const o = item.options || {};
  const l = item.optionsLabel || null;
  const parts = [];

  const spice = l?.spice || o.spice;
  if (spice) parts.push(`辣度：${spice}`);

  const cutleryLabel =
    l?.cutlery ||
    (o.cutlery ? `餐具：${o.cutlery === "NO" ? "不要餐具" : "要餐具"}` : "");
  if (cutleryLabel) parts.push(cutleryLabel.startsWith("餐具") ? cutleryLabel : `餐具：${cutleryLabel}`);

  const addons = l?.addons || o.addons;
  if (Array.isArray(addons) && addons.length) parts.push(`加购：${addons.join("、")}`);

  const noIng = l?.noIngredients || o.noIngredients;
  if (Array.isArray(noIng) && noIng.length) parts.push(`不要：${noIng.join("、")}`);

  const remarks = l?.remarks || o.remarkCodes;
  if (Array.isArray(remarks) && remarks.length) parts.push(`备注：${remarks.join("、")}`);

  return parts.join("；");
}
