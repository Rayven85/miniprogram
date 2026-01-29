import { db, dbSafe } from "../../utils/db";
import { toast, toastSuccess } from "../../utils/ui";
import { fenToYuan, sumFen, calcLineTotal } from "../../utils/money";
import { addToCart, normalizeOptions } from "../../utils/storage";
import { validateQty } from "../../utils/validators";

Page({
  data: {
    loaded: false,
    productId: "",
    product: {},
    tpl: {},
    // cutlery 内部值 YES/NO → UI 显示
    cutleryUI: [
      { code: "YES", label: "要餐具" },
      { code: "NO", label: "不要餐具" },
    ],
    form: {
      qty: 1,
      spice: "不辣",
      cutlery: "YES",
      addons: [],
      noIngredients: [],
      remarks: [],
    },
    summary: {
      addonsFee: 0,
      totalFee: 0,
      totalYuan: "0.00",
    },
    hasIngredients: false,
    hasNotices: false,
    hasSpice: false,
    hasCutlery: false,
    hasAddons: false,
    hasNoIngredients: false,
    hasRemarks: false,
  },

  onLoad(query) {
    const productId = query.productId;
    if (!productId) {
      toast("缺少 productId");
      return;
    }
    this.setData({ productId });
    this.init(productId);
  },

  async init(productId) {
    // 1) 拉 product
    const r1 = await dbSafe(
      async () => db.collection("products").doc(productId).get(),
      { loadingText: "加载中...", errorText: "加载菜品失败" }
    );
    if (!r1.ok) return;

    const product = r1.data.data;
    const priceYuan = fenToYuan(product.price);

    // 2) 拉 template（如果没有 optionTemplateId，就用空模板）
    let tpl = {
      spiceLevels: [],
      cutleryOptions: [],
      addons: [],
      noIngredients: [],
      remarks: [],
      rules: {},
    };
    const templateId = product.optionTemplateId;

    if (templateId) {
      const r2 = await dbSafe(
        async () => db.collection("optionTemplates").doc(templateId).get(),
        { errorText: "加载选项失败" }
      );
      if (r2.ok) tpl = r2.data.data;
    }

    // 预处理 tpl：过滤 enabled + 给 addons 生成 priceYuan
    const tplSafe = { ...tpl };

    tplSafe.addons = (tplSafe.addons || [])
      .filter((a) => a && a.enabled !== false)
      .map((a) => ({
        ...a,
        priceYuan: fenToYuan(a.price || 0),
      }));

    tplSafe.noIngredients = (tplSafe.noIngredients || []).filter((x) => x && x.enabled !== false);
    tplSafe.remarks = (tplSafe.remarks || []).filter((x) => x && x.enabled !== false);

    tpl = tplSafe;

    // 3) 初始化默认选项（用模板第一项做默认）
    const form = { ...this.data.form };
    if (tpl.spiceLevels?.length) form.spice = tpl.spiceLevels[0];
    if (tpl.cutleryOptions?.length) form.cutlery = tpl.cutleryOptions[0] === "NO" ? "NO" : "YES";
    
    // 4) 计算布尔显示字段
    const hasIngredients = Array.isArray(product.ingredients) && product.ingredients.length > 0;
    const hasNotices = Array.isArray(product.notices) && product.notices.length > 0;

    const hasSpice = Array.isArray(tpl.spiceLevels) && tpl.spiceLevels.length > 0;
    const hasCutlery = Array.isArray(tpl.cutleryOptions) && tpl.cutleryOptions.length > 0;
    const hasAddons = Array.isArray(tpl.addons) && tpl.addons.length > 0;
    const hasNoIngredients = Array.isArray(tpl.noIngredients) && tpl.noIngredients.length > 0;
    const hasRemarks = Array.isArray(tpl.remarks) && tpl.remarks.length > 0;

    this.setData({
      product: { ...product, priceYuan },
      tpl,
      form,
      loaded: true,
      hasIngredients,
      hasNotices,
      hasSpice,
      hasCutlery,
      hasAddons,
      hasNoIngredients,
      hasRemarks,
    });
    this.syncSelected();
    this.recalc();
  },

  // ====== 选择逻辑（为了 wxml 里能用）======
  isAddonSelected(code) {
    return (this.data.form.addons || []).includes(code);
  },
  isNoIngSelected(code) {
    return (this.data.form.noIngredients || []).includes(code);
  },
  isRemarkSelected(code) {
    return (this.data.form.remarks || []).includes(code);
  },

  // ====== 数量 ======
  incQty() {
    const qty = this.data.form.qty + 1;
    this.setData({ "form.qty": qty });
    this.recalc();
  },
  decQty() {
    const qty = Math.max(1, this.data.form.qty - 1);
    this.setData({ "form.qty": qty });
    this.recalc();
  },

  // ====== 单选 ======
  pickSpice(e) {
    const v = e.currentTarget.dataset.val;
    this.setData({ "form.spice": v });
    this.recalc();
  },
  pickCutlery(e) {
    const v = e.currentTarget.dataset.val; // YES/NO
    this.setData({ "form.cutlery": v });
    this.recalc();
  },

  // ====== 多选 ======
  toggleAddon(e) {
    const code = e.currentTarget.dataset.code;
    const set = new Set(this.data.form.addons || []);
    set.has(code) ? set.delete(code) : set.add(code);

    // 限制最大选择（来自模板 rules）
    const max = this.data.tpl?.rules?.maxAddonsSelected || 99;
    const arr = Array.from(set);
    if (arr.length > max) return toast(`加购最多选 ${max} 个`);

    this.setData({ "form.addons": arr });
    this.syncSelected();
    this.recalc();
  },

  toggleNoIng(e) {
    const code = e.currentTarget.dataset.code;
    const set = new Set(this.data.form.noIngredients || []);
    set.has(code) ? set.delete(code) : set.add(code);

    const max = this.data.tpl?.rules?.maxNoIngredientsSelected || 99;
    const arr = Array.from(set);
    if (arr.length > max) return toast(`最多选择 ${max} 个不要项`);

    this.setData({ "form.noIngredients": arr });
    this.syncSelected();
    this.recalc();
  },

  toggleRemark(e) {
    const code = e.currentTarget.dataset.code;
  
    const set = new Set(this.data.form.remarks || []);
    set.has(code) ? set.delete(code) : set.add(code);
  
    const max = this.data.tpl?.rules?.maxRemarksSelected || 99;
    const arr = Array.from(set);
  
    if (arr.length > max) return toast(`备注最多选 ${max} 个`);
  
    this.setData({ "form.remarks": arr });
    this.syncSelected();
    this.recalc();
  },
  
  syncSelected() {
    const { tpl, form } = this.data;
    const addonsSet = new Set(form.addons || []);
    const noSet = new Set(form.noIngredients || []);
    const remarkSet = new Set(form.remarks || []);
  
    const nextTpl = { ...tpl };
    nextTpl.addons = (nextTpl.addons || []).map(a => ({ ...a, selected: addonsSet.has(a.code) }));
    nextTpl.noIngredients = (nextTpl.noIngredients || []).map(a => ({ ...a, selected: noSet.has(a.code) }));
    nextTpl.remarks = (nextTpl.remarks || []).map(a => ({ ...a, selected: remarkSet.has(a.code) }));
  
    this.setData({ tpl: nextTpl });
  },

  // ====== 价格计算（前端展示用，真正下单后会在云函数再算一次）======
  recalc() {
    const { product, tpl, form } = this.data;
    if (!product?.price) return;

    // addon fee = sum(selected addon price)
    const addonMap = new Map((tpl.addons || []).map((a) => [a.code, a]));
    const addonFees = (form.addons || [])
      .map((code) => addonMap.get(code)?.price || 0);

    const addonsFee = sumFen(addonFees);
    const unit = product.price + addonsFee;
    const totalFee = calcLineTotal(unit, form.qty);

    this.setData({
      summary: {
        addonsFee,
        totalFee,
        totalYuan: fenToYuan(totalFee),
      },
    });
  },

  // ====== 加入购物车 ======
  addToCartTap() {
    const { product, tpl, form } = this.data;
  
    // qty 校验
    const maxQty = tpl?.rules?.maxQtyPerItem || 99;
    const qty = Math.max(1, Math.min(maxQty, Math.floor(Number(form.qty) || 1)));
  
    // ===== 计算 addonFee（分）+ 生成中文 label =====
    const addonMap = new Map((tpl.addons || []).map(a => [a.code, a]));
    const noIngMap = new Map((tpl.noIngredients || []).map(a => [a.code, a]));
    const remarkMap = new Map((tpl.remarks || []).map(a => [a.code, a]));
  
    const addonFee = (form.addons || []).reduce((sum, code) => {
      const a = addonMap.get(code);
      return sum + (a?.price || 0);
    }, 0);
  
    const options = normalizeOptions({
      spice: form.spice,
      cutlery: form.cutlery, // YES/NO
      addons: form.addons,
      noIngredients: form.noIngredients,
      remarkCodes: form.remarks || [],
      templateId: product.optionsTemplateId || "",
    });
  
    // 中文展示（给购物车页用）
    const optionsLabel = {
      spice: form.spice || "",
      cutlery: form.cutlery === "NO" ? "不要餐具" : "要餐具",
      addons: (form.addons || []).map(code => addonMap.get(code)?.name).filter(Boolean),
      noIngredients: (form.noIngredients || []).map(code => noIngMap.get(code)?.name).filter(Boolean),
      remarks: (form.remarks || []).map(code => remarkMap.get(code)?.name).filter(Boolean),
    };
  
    addToCart({
      productId: product._id,
      name: product.name,
      unitPrice: product.price,     // 分（基础价）
      addonFee,                     // 分（加购总额）
      qty,
      imageUrl: product.imageUrl,
      options,
      optionsLabel,
    });
  
    toastSuccess("已加入购物车");
    wx.navigateBack();
  }  
});
