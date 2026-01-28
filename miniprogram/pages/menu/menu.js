import { db, dbSafe } from "../../utils/db";
import { toast } from "../../utils/ui";
import { fenToYuan } from "../../utils/money";

Page({
  data: {
    categories: [],
    selectedCatId: "",
    selectedCatName: "",
    products: [],
    loading: false,
  },

  async onLoad() {
    await this.loadCategories();
  },

  async onPullDownRefresh() {
    // 下拉刷新：刷新当前分类的菜品
    const catId = this.data.selectedCatId;
    if (catId) await this.loadProducts(catId);
    wx.stopPullDownRefresh();
  },

  async loadCategories() {
    this.setData({ loading: true });

    const r = await dbSafe(
      async () =>
        db
          .collection("categories")
          .where({ isActive: true })
          .orderBy("sort", "asc")
          .get(),
      { errorText: "加载分类失败" }
    );

    if (!r.ok) {
      this.setData({ loading: false });
      return;
    }

    const categories = r.data.data || [];
    if (!categories.length) {
      this.setData({ categories: [], loading: false });
      toast("还没有分类数据");
      return;
    }

    const first = categories[0];
    this.setData({
      categories,
      selectedCatId: first._id,
      selectedCatName: first.name,
    });

    await this.loadProducts(first._id);
  },

  async loadProducts(categoryId) {
    this.setData({ loading: true, products: [] });

    const r = await dbSafe(
      async () =>
        db
          .collection("products")
          .where({ categoryId, isOnSale: true })
          .orderBy("sort", "asc")
          .get(),
      { errorText: "加载菜品失败" }
    );

    this.setData({ loading: false });

    if (!r.ok) return;

    const productsRaw = r.data.data || [];
    const products = productsRaw.map((p) => ({
      ...p,
      priceYuan: fenToYuan(p.price), // 用于展示
    }));

    this.setData({ products });
  },

  async onSelectCategory(e) {
    const id = e.currentTarget.dataset.id;
    if (!id || id === this.data.selectedCatId) return;

    const cat = this.data.categories.find((c) => c._id === id);
    this.setData({
      selectedCatId: id,
      selectedCatName: cat?.name || "",
    });

    await this.loadProducts(id);
  },

  goItem(e) {
    const productId = e.currentTarget.dataset.id;
    if (!productId) return;

    // 你后面 item 页我们会做
    wx.navigateTo({
      url: `/pages/item/item?productId=${productId}`,
    });
  },
});
