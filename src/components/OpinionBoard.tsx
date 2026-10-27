import type { ReactNode } from "react";
import { COLORS, SIGNAL, YELLOW_FRAME } from "@/lib/signal";
import { changed, countBy, type BoardOpinion } from "@/lib/opinions";
import type { Color } from "@/lib/types";
import { SIGNAL_STYLE, SignalDot, SpreadBar } from "./Signal";

const COLUMN_TITLE: Record<Color, string> = {
  green: "괜찮아요",
  yellow: "조건이 있으면 / 아직 고민",
  red: "안 돼요",
};

/** 의견 한 장 */
export function OpinionCard({
  o,
  big = false,
  showChange = false,
  actions,
}: {
  o: BoardOpinion;
  big?: boolean;
  showChange?: boolean;
  actions?: ReactNode;
}) {
  const color = showChange ? o.currentColor : o.firstColor;
  const isChanged = showChange && changed(o);
  return (
    <div
      className={`flex flex-col gap-1.5 rounded-2xl border-2 bg-white p-3 shadow-sm ${o.mine ? "ring-4 ring-sky" : ""} ${o.hidden ? "opacity-40" : ""} ${SIGNAL_STYLE[color].border}`}
    >
      {(isChanged || (o.yellowType && o.firstColor === "yellow")) && (
        <div className="flex flex-wrap items-center gap-1.5">
          {isChanged && (
            <span className={`inline-flex items-center gap-1 rounded-full bg-ink px-2 py-0.5 font-bold text-white ${big ? "text-lg" : "text-xs"}`}>
              {SIGNAL[o.firstColor].icon} {SIGNAL[o.firstColor].short} → {SIGNAL[o.currentColor].icon} {SIGNAL[o.currentColor].short}
            </span>
          )}
          {o.yellowType && o.firstColor === "yellow" && !isChanged && (
            <span className={`rounded-full bg-wait-bg px-2 py-0.5 font-bold text-wait-ink ${big ? "text-base" : "text-xs"}`}>
              {YELLOW_FRAME[o.yellowType].label}
            </span>
          )}
        </div>
      )}
      <p className={`break-words leading-snug ${big ? "text-2xl" : "text-base"}`}>{o.reason}</p>
      {isChanged && o.changeReason && (
        <p className={`rounded-xl bg-bg p-2 leading-snug ${big ? "text-xl" : "text-sm"}`}>
          <b>바뀐 이유</b> {o.changeReason}
        </p>
      )}
      {showChange && !isChanged && o.keepReason && (
        <p className={`rounded-xl bg-bg p-2 leading-snug ${big ? "text-xl" : "text-sm"}`}>
          <b>그대로인 이유</b> {o.keepReason}
        </p>
      )}
      {(o.name || o.mine || actions) && (
        <div className={`flex items-center gap-2 text-mute ${big ? "text-lg" : "text-xs"}`}>
          <span className="font-semibold">
            {o.mine ? "⭐ 나" : ""}
            {o.mine && o.name ? " · " : ""}
            {o.name ? `${o.number ?? ""}번 ${o.name}` : ""}
          </span>
          <div className="flex-1" />
          {actions}
        </div>
      )}
    </div>
  );
}

/** 초록·노랑·빨강 3열 게시판. showChange면 지금 색으로 나누고 바뀐 표시를 한다. */
export function OpinionBoard({
  opinions,
  big = false,
  showChange = false,
  actions,
}: {
  opinions: BoardOpinion[];
  big?: boolean;
  showChange?: boolean;
  actions?: (o: BoardOpinion) => ReactNode;
}) {
  const key = showChange ? "currentColor" : "firstColor";
  const counted = opinions.filter((o) => !o.hidden);
  const counts = countBy(counted, key);
  return (
    <div className="grid h-full min-h-0 grid-cols-3 gap-3">
      {COLORS.map((c) => {
        const list = opinions.filter((o) => o[key] === c);
        return (
          <section key={c} className={`flex min-h-0 flex-col rounded-3xl ${SIGNAL_STYLE[c].soft}`}>
            <header className={`flex items-center gap-2 rounded-t-3xl px-4 py-2 ${SIGNAL_STYLE[c].solid}`}>
              <SignalDot color={c} size={big ? 44 : 30} />
              <span className={`flex-1 font-jua leading-tight ${big ? "text-3xl" : "text-xl"}`}>{COLUMN_TITLE[c]}</span>
              <span className={`font-jua ${big ? "text-5xl" : "text-3xl"}`}>{counts[c]}</span>
              <span className={big ? "text-2xl" : "text-base"}>명</span>
            </header>
            <div
              className="grid min-h-0 flex-1 auto-rows-min gap-2 overflow-y-auto p-2"
              style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${big ? 280 : 170}px, 1fr))` }}
            >
              {list.map((o) => (
                <OpinionCard key={o.id} o={o} big={big} showChange={showChange} actions={actions?.(o)} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

/** 처음 → 지금 색 분포 막대 2줄 */
export function ChangeBars({ opinions, big = false }: { opinions: BoardOpinion[]; big?: boolean }) {
  const list = opinions.filter((o) => !o.hidden);
  const moved = list.filter(changed).length;
  const h = big ? 40 : 26;
  return (
    <div className={`grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-1.5 ${big ? "text-2xl" : "text-base"}`}>
      <span className="font-jua text-mute">처음</span>
      <SpreadBar counts={countBy(list, "firstColor")} height={h} />
      <span className="row-span-2 text-center font-jua">
        생각이 바뀐 친구
        <br />
        <b className={`text-coral ${big ? "text-5xl" : "text-3xl"}`}>{moved}</b>명
      </span>
      <span className="font-jua text-blue">지금</span>
      <SpreadBar counts={countBy(list, "currentColor")} height={h} />
    </div>
  );
}

/** 전광판 크게 보기 */
export function FeaturedOverlay({ o, showChange, onClose }: { o: BoardOpinion; showChange: boolean; onClose?: () => void }) {
  const color = showChange ? o.currentColor : o.firstColor;
  const isChanged = showChange && changed(o);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/60 p-10" onClick={onClose}>
      <div className={`flex w-full max-w-6xl flex-col gap-6 rounded-[2.5rem] border-[10px] bg-white p-12 shadow-2xl ${SIGNAL_STYLE[color].border}`}>
        <div className="flex items-center gap-4">
          <SignalDot color={color} size={90} />
          <span className={`font-jua text-5xl ${SIGNAL_STYLE[color].text}`}>
            {isChanged ? `${SIGNAL[o.firstColor].short} → ${SIGNAL[o.currentColor].short}` : COLUMN_TITLE[color]}
          </span>
          <div className="flex-1" />
          {o.name && <span className="font-jua text-4xl text-mute">{o.number}번 {o.name}</span>}
        </div>
        <p className="font-jua text-7xl leading-tight">{o.reason}</p>
        {isChanged && o.changeReason && (
          <p className="rounded-3xl bg-bg p-6 text-5xl leading-tight">
            <b>바뀐 이유</b> {o.changeReason}
          </p>
        )}
        {showChange && !isChanged && o.keepReason && (
          <p className="rounded-3xl bg-bg p-6 text-5xl leading-tight">
            <b>그대로인 이유</b> {o.keepReason}
          </p>
        )}
      </div>
    </div>
  );
}
