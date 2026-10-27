import { cardSpreads, mostDividedId } from "@/lib/divided";
import type { CardRow, GroupVoteRow } from "@/lib/types";
import { SIGNAL_STYLE, SignalDot, SpreadBar } from "./Signal";
import { SIGNAL } from "@/lib/signal";

/**
 * 모둠 신호등표: 카드(세로) × 모둠(가로). 화면을 꽉 채우도록 grid로 늘어난다.
 * big=true 면 전광판용 큰 글자.
 */
export function GroupBoard({
  cards,
  votes,
  groups,
  big = false,
}: {
  cards: CardRow[];
  votes: GroupVoteRow[];
  groups: number[];
  big?: boolean;
}) {
  const spreads = cardSpreads(cards, votes, groups.length);
  const divided = mostDividedId(spreads);
  const vote = (cardId: string, g: number) => votes.find((v) => v.card_id === cardId && v.group_no === g);

  if (!cards.length) return <p className="p-8 text-center text-mute">카드가 없어요. 토론 편집에서 카드를 만들어 주세요.</p>;
  if (!groups.length) return <p className="p-8 text-center text-mute">모둠이 정해진 학생이 없어요. ‘학생·PIN’에서 모둠을 정해 주세요.</p>;

  return (
    <div
      className="grid h-full min-h-0 gap-2"
      style={{
        gridTemplateColumns: `minmax(${big ? 260 : 180}px, 1.4fr) repeat(${groups.length}, minmax(0, 1fr)) minmax(${big ? 220 : 150}px, 1.1fr)`,
        gridTemplateRows: `auto repeat(${cards.length}, minmax(0, 1fr))`,
      }}
    >
      <div />
      {groups.map((g) => (
        <div key={g} className={`text-center font-jua ${big ? "text-3xl" : "text-xl"} text-blue`}>
          {g}모둠
        </div>
      ))}
      <div className={`text-center font-jua ${big ? "text-2xl" : "text-lg"} text-mute`}>색 나누기</div>

      {spreads.map(({ card, counts }) => {
        const isDivided = card.id === divided;
        return (
          <div key={card.id} className="contents">
            <div
              className={`relative flex min-h-0 flex-col justify-center rounded-2xl border-2 bg-white px-3 py-2 ${isDivided ? "border-coral ring-4 ring-coral/30" : "border-line"}`}
            >
              {isDivided && (
                <span className={`absolute -top-3 left-3 rounded-full bg-coral px-3 py-0.5 font-bold text-white ${big ? "text-base" : "text-xs"}`}>
                  ⚡ 가장 갈린 카드
                </span>
              )}
              <p className={`font-jua ${big ? "text-3xl" : "text-xl"} leading-tight`}>
                <span className="text-coral">{card.label}</span> {card.title}
              </p>
            </div>
            {groups.map((g) => {
              const v = vote(card.id, g);
              return (
                <div
                  key={g}
                  className={`flex min-h-0 flex-col items-center justify-center gap-1 overflow-hidden rounded-2xl border-2 p-2 text-center ${v ? `${SIGNAL_STYLE[v.color].soft} ${SIGNAL_STYLE[v.color].border}` : "border-dashed border-line bg-white/60"}`}
                  title={v?.reason}
                >
                  {v ? (
                    <>
                      <div className="flex items-center gap-1.5">
                        <SignalDot color={v.color} size={big ? 40 : 26} />
                        <span className={`font-bold ${SIGNAL_STYLE[v.color].text} ${big ? "text-xl" : "text-sm"}`}>
                          {v.color === "yellow" ? "조건·고민" : SIGNAL[v.color].label}
                        </span>
                      </div>
                      {v.reason && (
                        <p className={`line-clamp-2 leading-snug text-ink ${big ? "text-lg" : "text-xs"}`}>{v.reason}</p>
                      )}
                    </>
                  ) : (
                    <span className={`text-mute ${big ? "text-xl" : "text-sm"}`}>…</span>
                  )}
                </div>
              );
            })}
            <div className="flex min-h-0 items-center">
              <div className="w-full">
                <SpreadBar counts={counts} height={big ? 40 : 26} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
