import { SIGNAL, COLORS } from "@/lib/signal";
import type { Color } from "@/lib/types";

export const SIGNAL_STYLE: Record<Color, { solid: string; soft: string; text: string; border: string }> = {
  green: { solid: "bg-go text-white", soft: "bg-go-bg", text: "text-go", border: "border-go" },
  yellow: { solid: "bg-wait text-wait-ink", soft: "bg-wait-bg", text: "text-wait-ink", border: "border-wait" },
  red: { solid: "bg-stop text-white", soft: "bg-stop-bg", text: "text-stop", border: "border-stop" },
};

/** 동그란 신호등 아이콘(✓ ! ✕) */
export function SignalDot({ color, size = 28 }: { color: Color; size?: number }) {
  return (
    <span
      className={`${SIGNAL_STYLE[color].solid} inline-grid shrink-0 place-items-center rounded-full font-black`}
      style={{ width: size, height: size, fontSize: size * 0.55 }}
      aria-hidden
    >
      {SIGNAL[color].icon}
    </span>
  );
}

/** 아이콘 + 짧은 글자 */
export function SignalTag({ color, className = "" }: { color: Color; className?: string }) {
  const short = color === "yellow" ? "조건·고민" : SIGNAL[color].label;
  return (
    <span className={`inline-flex items-center gap-1.5 font-bold ${SIGNAL_STYLE[color].text} ${className}`}>
      <SignalDot color={color} size={22} />
      {short}
    </span>
  );
}

/** 색 분포 막대(아이콘·숫자 포함) */
export function SpreadBar({ counts, height = 28 }: { counts: Record<Color, number>; height?: number }) {
  const total = counts.green + counts.yellow + counts.red;
  if (!total) return <div className="rounded-full bg-line/60" style={{ height }} />;
  return (
    <div className="flex overflow-hidden rounded-full" style={{ height }}>
      {COLORS.filter((c) => counts[c] > 0).map((c) => (
        <div
          key={c}
          className={`${SIGNAL_STYLE[c].solid} flex items-center justify-center gap-1 font-bold`}
          style={{ width: `${(counts[c] / total) * 100}%`, fontSize: height * 0.55 }}
        >
          {SIGNAL[c].icon} {counts[c]}
        </div>
      ))}
    </div>
  );
}
