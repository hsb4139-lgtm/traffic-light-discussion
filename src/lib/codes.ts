// 헷갈리는 글자(0/O, 1/I/L) 제외
const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function randomInt(max: number) {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] % max;
}

export function makeJoinCode() {
  return Array.from({ length: 6 }, () => CODE_CHARS[randomInt(CODE_CHARS.length)]).join("");
}

export function makePin() {
  return String(randomInt(10000)).padStart(4, "0");
}

export const normalizeCode = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
