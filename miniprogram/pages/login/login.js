import { callCloud } from "../../utils/cloud";
import { db, dbSafe } from "../../utils/db";
import { toast, toastSuccess } from "../../utils/ui";
import { isValidPhone, requiredText } from "../../utils/validators";

Page({
  data: {
    openid: "",
    form: {
      name: "",
      wechatName: "",
      phone: "",
    },
  },

  async onLoad() {
    // 1) 拿 openid
    const r1 = await callCloud("getOpenid", {}, { loadingText: "初始化中..." });
    if (!r1.ok) return;

    const openid = r1.data?.openid;
    if (!openid) {
      toast("openid 获取失败");
      return;
    }
    this.setData({ openid });

    // 2) 读取用户资料（如果存在就回填）
    const r2 = await dbSafe(
      async () => db.collection("users").where({ openid }).get(),
      { errorText: "读取用户信息失败" }
    );
    if (!r2.ok) return;

    const list = r2.data?.data || [];
    if (list.length) {
      const u = list[0];
      this.setData({
        form: {
          name: u.name || "",
          wechatName: u.wechatName || "",
          phone: u.phone || "",
        },
      });
    }
  },

  // 输入绑定
  onName(e) {
    this.setData({ "form.name": e.detail.value });
  },
  onWechatName(e) {
    this.setData({ "form.wechatName": e.detail.value });
  },
  onPhone(e) {
    this.setData({ "form.phone": e.detail.value });
  },

  async onSave() {
    const { openid, form } = this.data;

    if (!openid) {
      toast("系统初始化未完成，请稍后再试");
      return;
    }

    // 基础校验
    const c1 = requiredText(form.name, 1, 20);
    if (!c1.ok) return toast("请填写姓名");

    const c2 = requiredText(form.wechatName, 1, 30);
    if (!c2.ok) return toast("请填写微信名");

    if (!isValidPhone(form.phone)) {
      toast("电话格式不正确");
      return;
    }

    // 先查是否存在，再 update / add（最稳、最直观）
    const now = db.serverDate();

    const rFind = await dbSafe(
      async () => db.collection("users").where({ openid }).get(),
      { loadingText: "保存中...", errorText: "保存失败" }
    );
    if (!rFind.ok) return;

    const existed = (rFind.data?.data || [])[0];

    if (existed?._id) {
      const rUpdate = await dbSafe(
        async () =>
          db.collection("users").doc(existed._id).update({
            data: {
              name: form.name.trim(),
              wechatName: form.wechatName.trim(),
              phone: String(form.phone).trim(),
              updatedAt: now,
            },
          }),
        { errorText: "更新失败" }
      );
      if (!rUpdate.ok) return;
    } else {
      const rAdd = await dbSafe(
        async () =>
          db.collection("users").add({
            data: {
              openid,
              name: form.name.trim(),
              wechatName: form.wechatName.trim(),
              phone: String(form.phone).trim(),
              createdAt: now,
              updatedAt: now,
            },
          }),
        { errorText: "保存失败" }
      );
      if (!rAdd.ok) return;
    }

    toastSuccess("已保存");
    wx.reLaunch({ url: "/pages/menu/menu" });
  },
});
