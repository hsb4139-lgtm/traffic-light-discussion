"use client";

import { useState } from "react";
import type { StudentState } from "@/lib/useStudentState";
import type { Color } from "@/lib/types";
import { COLORS, SIGNAL } from "@/lib/signal";
import { SIGNAL_STYLE, SignalDot } from "@/components/Signal";

type Draft = { color: Color | null; reason: string };
const REASON_MAX = 100;

/** 모둠 신호등: [카드 목록 | 사례 내용 | 우리 모둠 색·이유] 3칸 가로 화면 */
export function GroupSignal({ state, refresh }: { state: StudentState; refresh: () => void }) {
  const { me, cards, groupVotes } = state;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  if (!me.groupNo) {
    return <Notice>아직 모둠이 정해지지 않았어요. 선생님께 말해요.</Notice>;
  }
  if (!cards.length) return <Notice>선생님이 카드를 준비하고 있어요.</Notice>;

  const card = cards.find((c) => c.id === selectedId) ?? cards[0];
  const saved = groupVotes.find((v) => v.card_id === card.id);
  const draft: Draft = drafts[card.id] ?? { color: saved?.color ?? null, reason: saved?.reason ?? "" };
  const dirty = !!drafts[card.id] && (draft.color !== (saved?.color ?? null) || draft.reason !== (saved?.reason ?? ""));
  const setDraft = (p: Partial<Draft>) => setDrafts((d) => ({ ...d, [card.id]: { ...draft, ...p } }));

  async function save() {
    if (!draft.color) return setMsg("색을 먼저 골라요.");
    setBusy(true);
    setMsg("");
    const res = await fetch("/api/s/group-votes", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardId: card.id, color: draft.color, reason: draft.reason }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setMsg(data.error ?? "다시 눌러 봐요.");
    setDrafts((d) => {
      const next = { ...d };
      delete next[card.id];
      return next;
    });
    refresh();
    // 아직 안 한 다음 카드로
    const done = new Set([...groupVotes.map((v) => v.card_id), card.id]);
    const nextCard = cards.find((c) => !done.has(c.id));
    if (nextCard) setSelectedId(nextCard.id);
    setMsg("저장했어요 ✓");
  }

  return (
    <div className="grid h-full grid-cols-[220px_1fr_minmax(340px,0.9fr)] gap-3 p-3">
      {/* 카드 목록 */}
      <nav className="flex min-h-0 flex-col gap-2 overflow-auto">
        <p className="px-1 font-jua text-xl text-mute">{me.groupNo}모둠 카드</p>
        {cards.map((c) => {
          const v = groupVotes.find((x) => x.card_id === c.id);
          const on = c.id === card.id;
          return (
            <button
              key={c.id}
              onClick={() => {
                setSelectedId(c.id);
                setMsg("");
              }}
              className={`flex min-h-16 items-center gap-2 rounded-2xl border-2 px-3 text-left transition ${on ? "border-blue bg-blue text-white" : "border-line bg-white"}`}
            >
              <span className="font-jua text-2xl">{c.label}</span>
              <span className="line-clamp-2 flex-1 font-semibold leading-tight">{c.title}</span>
              {v ? <SignalDot color={v.color} size={28} /> : <span className={`text-sm ${on ? "text-white/80" : "text-mute"}`}>아직</span>}
            </button>
          );
        })}
      </nav>

      {/* 사례 내용 */}
      <article className="panel flex min-h-0 flex-col gap-3 overflow-auto p-6">
        <p className="font-jua text-4xl leading-tight">
          <span className="text-coral">{card.label}</span> {card.title}
        </p>
        <p className="whitespace-pre-wrap text-2xl leading-relaxed">{card.body}</p>
      </article>

      {/* 우리 모둠 신호등 */}
      <section className="panel flex min-h-0 flex-col gap-3 overflow-auto p-4">
        <p className="font-jua text-2xl">우리 모둠 신호등</p>
        {!me.canEditGroup ? (
          <div className="flex flex-1 flex-col gap-3">
            {saved ? (
              <div className={`rounded-2xl border-2 p-4 ${SIGNAL_STYLE[saved.color].soft} ${SIGNAL_STYLE[saved.color].border}`}>
                <div className="flex items-center gap-2">
                  <SignalDot color={saved.color} size={40} />
                  <span className={`text-xl font-bold ${SIGNAL_STYLE[saved.color].text}`}>{SIGNAL[saved.color].label}</span>
                </div>
                {saved.reason && <p className="mt-3 text-xl">{saved.reason}</p>}
              </div>
            ) : (
              <p className="rounded-2xl bg-bg p-4 text-xl text-mute">아직 정하지 않았어요.</p>
            )}
            <p className="rounded-2xl bg-wait-bg p-4 text-lg font-semibold text-wait-ink">
              ★ 모둠 대표가 입력해요. 모둠 친구들과 함께 이야기해서 색을 정해요.
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-2">
              {COLORS.map((c) => {
                const on = draft.color === c;
                return (
                  <button
                    key={c}
                    onClick={() => setDraft({ color: c })}
                    aria-pressed={on}
                    className={`flex min-h-16 items-center gap-3 rounded-2xl border-4 px-4 text-left text-lg font-bold transition active:scale-[0.98] ${
                      on ? `${SIGNAL_STYLE[c].solid} ${SIGNAL_STYLE[c].border}` : `${SIGNAL_STYLE[c].soft} border-transparent ${SIGNAL_STYLE[c].text}`
                    }`}
                  >
                    <SignalDot color={c} size={40} />
                    <span className="leading-tight">{SIGNAL[c].label}</span>
                  </button>
                );
              })}
            </div>
            <label className="text-sm text-mute" htmlFor="group-reason">
              모둠 이유 한 줄
            </label>
            <textarea
              id="group-reason"
              className="field min-h-24 flex-1 resize-none py-2 text-xl"
              value={draft.reason}
              maxLength={REASON_MAX}
              onChange={(e) => setDraft({ reason: e.target.value })}
              placeholder="왜 이 색을 골랐나요?"
            />
            <p className="-mt-2 text-right text-sm text-mute">
              {draft.reason.length}/{REASON_MAX}
            </p>
            <button className="btn min-h-16 text-2xl" onClick={save} disabled={busy || !draft.color || (!dirty && !!saved)}>
              {busy ? "저장 중…" : saved && !dirty ? "저장됨 ✓" : "모둠 신호등 올리기"}
            </button>
          </>
        )}
        {msg && <p className="rounded-xl bg-bg p-2 text-center font-bold">{msg}</p>}
      </section>
    </div>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid h-full place-items-center p-6 text-center">
      <p className="font-jua text-4xl text-mute">{children}</p>
    </div>
  );
}
