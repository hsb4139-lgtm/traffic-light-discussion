import type { Color, YellowType } from "./types";

// 색만으로 구분하지 않는다: 항상 아이콘 + 글자를 함께 쓴다.
export const SIGNAL: Record<Color, { icon: string; label: string; short: string }> = {
  green: { icon: "✓", label: "괜찮아요", short: "초록" },
  yellow: { icon: "!", label: "조건이 있으면 괜찮아요 / 아직 판단이 어려워요", short: "노랑" },
  red: { icon: "✕", label: "안 돼요", short: "빨강" },
};

export const COLORS: Color[] = ["green", "yellow", "red"];

export const YELLOW_FRAME: Record<YellowType, { label: string; hint: string }> = {
  condition: { label: "조건이 있으면 괜찮아요", hint: "___한다면 괜찮아요" },
  curious: { label: "아직 판단이 어려워요", hint: "___을 더 알고 싶어요" },
};

export const isColor = (v: unknown): v is Color => v === "green" || v === "yellow" || v === "red";
