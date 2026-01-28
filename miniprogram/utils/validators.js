// utils/validators.js

export function isValidPhone(phone) {
  // 你现在做“同学下单”，可能出现 NZ/中国号，这里做宽松校验：8~15位数字
  const s = String(phone || "").trim();
  return /^\d{8,15}$/.test(s);
}

export function requiredText(val, minLen = 1, maxLen = 50) {
  const s = String(val || "").trim();
  if (s.length < minLen) return { ok: false, msg: `至少需要 ${minLen} 个字符` };
  if (s.length > maxLen) return { ok: false, msg: `最多 ${maxLen} 个字符` };
  return { ok: true, msg: "" };
}

// 选项校验：只允许在“白名单”中出现（防止前端乱传）
// allow: string[] 允许值
export function validateOneOf(value, allow, fieldName = "选项") {
  const v = String(value ?? "");
  if (!Array.isArray(allow) || allow.length === 0) {
    return { ok: false, msg: `${fieldName}配置为空` };
  }
  if (!allow.includes(v)) {
    return { ok: false, msg: `${fieldName}不合法` };
  }
  return { ok: true, msg: "" };
}

// 多选校验：所有值都必须在 allow 内
export function validateMultiOf(values, allow, fieldName = "选项") {
  const arr = Array.isArray(values) ? values.map(v => String(v)) : [];
  if (!Array.isArray(allow)) allow = [];
  const bad = arr.filter(v => !allow.includes(v));
  if (bad.length) return { ok: false, msg: `${fieldName}包含不合法项：${bad.join(",")}` };
  return { ok: true, msg: "" };
}

// 数量校验
export function validateQty(qty, min = 1, max = 99) {
  const n = Number(qty);
  if (!Number.isInteger(n)) return { ok: false, msg: "数量必须是整数" };
  if (n < min || n > max) return { ok: false, msg: `数量范围 ${min}~${max}` };
  return { ok: true, msg: "" };
}
