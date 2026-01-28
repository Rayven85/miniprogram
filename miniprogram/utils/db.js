// utils/db.js
import { ENV_ID } from "../env";
import { safeRun } from "./safe";

const db = wx.cloud.database({ env: ENV_ID });

export { db };

/**
 * 安全执行数据库操作（你传入一个 async 函数，里面写 db.collection...）
 */
export async function dbSafe(fn, opt = {}) {
  return safeRun(fn, {
    loadingText: opt.loadingText,
    errorText: opt.errorText || "数据库操作失败",
  });
}
