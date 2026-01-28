// utils/money.js
// 全部金额统一用“分”（整数）存储，避免浮点误差

export function yuanToFen(yuan) {
  // yuan 可以是 number 或 string，比如 "12.90"
  const n = Number(yuan);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

export function fenToYuan(fen) {
  const n = Number(fen);
  if (!Number.isFinite(n)) return "0.00";
  return (n / 100).toFixed(2);
}

export function sumFen(list) {
  // list: number[] (分)
  return (list || []).reduce((acc, v) => {
    const n = Number(v);
    return acc + (Number.isFinite(n) ? n : 0);
  }, 0);
}

export function calcLineTotal(unitPriceFen, qty) {
  const price = Number(unitPriceFen);
  const q = Number(qty);
  if (!Number.isFinite(price) || !Number.isFinite(q) || q <= 0) return 0;
  return Math.round(price * q);
}
