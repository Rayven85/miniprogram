// utils/cloud.js
import { safeRun } from "./safe";
import { ENV_ID } from "../env";

/**
 * 调用云函数（统一 env、统一错误处理、可选 loading）
 */
export async function callCloud(name, data = {}, opt = {}) {
  return safeRun(
    async () => {
      const res = await wx.cloud.callFunction({
        name,
        data,
        config: { env: ENV_ID }, // 强制指定 env，避免串环境
      });

      // 统一返回 res.result（更常用）
      return res.result;
    },
    {
      loadingText: opt.loadingText,
      errorText: opt.errorText || `请求失败：${name}`,
    }
  );
}
