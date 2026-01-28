// utils/ui.js

export function toast(msg, icon = "none", duration = 2000) {
  wx.showToast({ title: String(msg || "操作失败"), icon, duration });
}

export function toastSuccess(msg = "成功") {
  wx.showToast({ title: msg, icon: "success", duration: 1500 });
}

export function showLoading(title = "加载中...") {
  wx.showLoading({ title, mask: true });
}

export function hideLoading() {
  wx.hideLoading();
}
