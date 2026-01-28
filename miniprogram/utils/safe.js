// utils/safe.js
import { toast, showLoading, hideLoading } from "./ui";

/**
 * 统一处理错误：console 打印 + 给用户 toast
 */
export function handleError(err, userMsg = "操作失败，请重试") {
  console.error("[ERROR]", err);
  // 云函数/数据库常见错误结构里，可能有 err.errMsg
  const detail = err?.errMsg || err?.message || "";
  // 你可以按需把 detail 拼进去（调试期建议显示一点）
  toast(userMsg);
  return { ok: false, err, detail };
}

/**
 * 安全执行 async 函数：自动 try/catch + 可选 loading + toast
 * @param {Function} fn - async () => any
 * @param {Object} opt - { loadingText, errorText }
 */
export async function safeRun(fn, opt = {}) {
  const { loadingText, errorText = "操作失败，请重试" } = opt;
  try {
    if (loadingText) showLoading(loadingText);
    const data = await fn();
    return { ok: true, data };
  } catch (err) {
    return handleError(err, errorText);
  } finally {
    if (loadingText) hideLoading();
  }
}
