// miniprogram/app.js
import { ENV_ID } from "./env";

App({
  onLaunch() {
    if (!wx.cloud) {
      console.error("请使用 2.2.3 或以上的基础库以使用云能力");
      return;
    }

    wx.cloud.init({
      env: ENV_ID,
      traceUser: true,
    });

    this.globalData = {
      env: ENV_ID,
    };
  },
});
