"use client";

import { useState } from "react";
import type { StudentCard, StudentState } from "@/lib/useStudentState";
import type { Color, YellowType } from "@/lib/types";
import { COLORS, SIGNAL, YELLOW_FRAME } from "@/lib/signal";
import { ChangeBars, OpinionBoard } from "@/components/OpinionBoard";
import { SIGNAL_STYLE, SignalDot } from "@/components/Signal";

const REASON_MAX = 100;

async function send(url: string, method: string, body: unknown) {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  return res.ok ? null : ((data.error as string) ?? "다시 눌러 봐요.");
}

/** 열린 카드 고르기 + 사례 내용 */
function CardHead({ cards, card, onPick }: { cards: StudentCard[]; card: StudentCard; onPick: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col gap-2">
      {cards.length > 1 && (
        <div className="flex gap-1.5">
          {cards.map((c) => (
            <button
              key={c.id}
              onClick={() => onPick(c.id)}
              className={`min-h-11 flex-1 rounded-xl border-2 font-jua text-lg ${c.id === card.id ? "border-blue bg-blue text-white" : "border-line bg-white text-mute"}`}
            >
              카드 {c.label}
            </button>
          ))}
        </div>
      )}
      <button className="text-left" onClick={() => setOpen(!open)}>
        <p className="font-jua text-3xl leading-tight">
          <span className="text-coral">{card.label}</span> {card.title}
        </p>
        <p className={`mt-1 whitespace-pre-wrap text-lg leading-relaxed text-ink/80 ${open ? "" : "line-clamp-3"}`}>{card.body}</p>
        {card.body.length > 80 && <span className="text-sm text-blue">{open ? "접기 ▲" : "자세히 ▼"}</span>}
      </button>
    </div>
  );
}

function ColorButtons({ value, onPick, disabled }: { value: Color | null; onPick: (c: Color) => void; disabled?: Color }) {
  return (
    <div className="flex flex-col gap-2">
      {COLORS.map((c) => {
        const on = value === c;
        const off = disabled === c;
        return (
          <button
            key={c}
            disabled={off}
            onClick={() => onPick(c)}
            aria-pressed={on}
            className={`flex min-h-14 items-center gap-3 rounded-2xl border-4 px-3 text-left font-bold transition active:scale-[0.98] disabled:opacity-30 ${
              on ? `${SIGNAL_STYLE[c].solid} ${SIGNAL_STYLE[c].border}` : `${SIGNAL_STYLE[c].soft} border-transparent ${SIGNAL_STYLE[c].text}`
            }`}
          >
            <SignalDot color={c} size={36} />
            <span className="leading-tight">{SIGNAL[c].label}</span>
          </button>
        );
      })}
    </div>
  );
}

function useOpenCards(state: StudentState) {
  const open = state.cards.filter((c) => c.personal_open);
  const [pickedId, setPickedId] = useState<string | null>(null);
  const card = open.find((c) => c.id === pickedId) ?? open[0] ?? null;
  return { open, card, pick: setPickedId };
}

function Layout({ left, right }: { left: React.ReactNode; right: React.ReactNode }) {
  return (
    <div className="grid h-full grid-cols-[minmax(340px,0.85fr)_2.6fr] gap-3 p-3">
      <aside className="panel flex min-h-0 flex-col gap-3 overflow-y-auto p-4">{left}</aside>
      <div className="flex min-h-0 flex-col gap-3">{right}</div>
    </div>
  );
}

const NoCard = () => (
  <div className="grid h-full place-items-center text-center">
    <p className="font-jua text-4xl text-mute">선생님이 카드를 열면 의견을 쓸 수 있어요.</p>
  </div>
);

/* ───────────── 개인 의견 ───────────── */

type Draft = { color: Color | null; yellowType: YellowType; reason: string };

export function PersonalOpinion({ state, refresh }: { state: StudentState; refresh: () => void }) {
  const { open, card, pick } = useOpenCards(state);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  if (!card) return <NoCard />;

  const mine = state.myOpinions.find((o) => o.cardId === card.id);
  const draft: Draft = drafts[card.id] ?? {
    color: mine?.firstColor ?? null,
    yellowType: mine?.yellowType ?? "condition",
    reason: mine?.reason ?? "",
  };
  const setDraft = (p: Partial<Draft>) => setDrafts((d) => ({ ...d, [card.id]: { ...draft, ...p } }));
  const dirty =
    !mine || draft.color !== mine.firstColor || draft.reason !== mine.reason || (draft.color === "yellow" && draft.yellowType !== mine.yellowType);

  async function save() {
    if (!draft.color) return setMsg("색을 먼저 골라요.");
    if (!draft.reason.trim()) return setMsg("이유를 한 줄 써요.");
    setBusy(true);
    setMsg("");
    const err = await send("/api/s/opinions", "PUT", { cardId: card!.id, ...draft });
    setBusy(false);
    if (err) return setMsg(err);
    setDrafts((d) => {
      const n = { ...d };
      delete n[card!.id];
      return n;
    });
    setMsg(mine ? "고쳤어요 ✓" : "올렸어요 ✓");
    refresh();
  }

  const placeholder =
    draft.color === "yellow" ? YELLOW_FRAME[draft.yellowType].hint : draft.color ? "왜 이 색을 골랐나요?" : "먼저 색을 골라요";

  return (
    <Layout
      left={
        <>
          <CardHead cards={open} card={card} onPick={(id) => { pick(id); setMsg(""); }} />
          <hr className="border-line" />
          <p className="font-jua text-2xl">내 생각은?</p>
          <ColorButtons value={draft.color} onPick={(c) => setDraft({ color: c })} />
          {draft.color === "yellow" && (
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(YELLOW_FRAME) as YellowType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setDraft({ yellowType: t })}
                  className={`min-h-12 rounded-xl border-2 px-2 text-sm font-bold ${draft.yellowType === t ? "border-wait bg-wait text-wait-ink" : "border-line bg-white text-mute"}`}
                >
                  {YELLOW_FRAME[t].label}
                </button>
              ))}
            </div>
          )}
          <textarea
            className="field min-h-24 resize-none py-2 text-xl"
            value={draft.reason}
            maxLength={REASON_MAX}
            onChange={(e) => setDraft({ reason: e.target.value })}
            placeholder={placeholder}
            aria-label="이유 한 줄"
          />
          <p className="-mt-2 text-right text-sm text-mute">
            {draft.reason.length}/{REASON_MAX} · 이름 말고 다른 개인정보는 쓰지 않아요
          </p>
          <button className="btn min-h-14 text-2xl" onClick={save} disabled={busy || !dirty}>
            {busy ? "올리는 중…" : !dirty ? "올렸어요 ✓" : mine ? "고쳐서 올리기" : "의견 올리기"}
          </button>
          {msg && <p className="rounded-xl bg-bg p-2 text-center font-bold">{msg}</p>}
        </>
      }
      right={<OpinionBoard opinions={state.opinions.filter((o) => o.cardId === card.id)} />}
    />
  );
}

/* ───────────── 다시 투표 ───────────── */

type RevoteDraft = { action: "keep" | "change" | null; color: Color | null; reason: string };

export function Revote({ state, refresh }: { state: StudentState; refresh: () => void }) {
  const { open, card, pick } = useOpenCards(state);
  const [drafts, setDrafts] = useState<Record<string, RevoteDraft>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  if (!card) return <NoCard />;

  const mine = state.myOpinions.find((o) => o.cardId === card.id);
  const board = state.opinions.filter((o) => o.cardId === card.id);
  const saved: RevoteDraft | null = mine?.revoted
    ? mine.currentColor !== mine.firstColor
      ? { action: "change", color: mine.currentColor, reason: mine.changeReason ?? "" }
      : { action: "keep", color: null, reason: mine.keepReason ?? "" }
    : null;
  const draft: RevoteDraft = drafts[card.id] ?? saved ?? { action: null, color: null, reason: "" };
  const setDraft = (p: Partial<RevoteDraft>) => setDrafts((d) => ({ ...d, [card.id]: { ...draft, ...p } }));
  const dirty = !!drafts[card.id];

  async function save() {
    if (!draft.action) return;
    if (draft.action === "change" && !draft.color) return setMsg("새 색을 골라요.");
    if (draft.action === "change" && !draft.reason.trim()) return setMsg("생각이 바뀐 이유를 꼭 써요.");
    setBusy(true);
    setMsg("");
    const err = await send("/api/s/revote", "POST", { cardId: card!.id, ...draft });
    setBusy(false);
    if (err) return setMsg(err);
    setDrafts((d) => {
      const n = { ...d };
      delete n[card!.id];
      return n;
    });
    setMsg("저장했어요 ✓");
    refresh();
  }

  return (
    <Layout
      left={
        <>
          <CardHead cards={open} card={card} onPick={(id) => { pick(id); setMsg(""); }} />
          <hr className="border-line" />
          {!mine ? (
            <p className="rounded-2xl bg-bg p-4 text-lg text-mute">처음 의견이 없어서 다시 투표는 할 수 없어요. 친구들 의견을 읽어 봐요.</p>
          ) : (
            <>
              <div className={`rounded-2xl border-2 p-3 ${SIGNAL_STYLE[mine.firstColor].soft} ${SIGNAL_STYLE[mine.firstColor].border}`}>
                <p className="text-sm text-mute">처음 내 생각</p>
                <div className="flex items-center gap-2">
                  <SignalDot color={mine.firstColor} size={30} />
                  <b className={SIGNAL_STYLE[mine.firstColor].text}>{SIGNAL[mine.firstColor].label}</b>
                </div>
                <p className="mt-1 text-lg">{mine.reason}</p>
              </div>
              <p className="font-jua text-2xl">친구 의견을 듣고 나서…</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setDraft({ action: "keep", color: null })}
                  className={`min-h-16 rounded-2xl border-4 font-jua text-2xl ${draft.action === "keep" ? "border-blue bg-blue text-white" : "border-line bg-white"}`}
                >
                  그대로
                </button>
                <button
                  onClick={() => setDraft({ action: "change" })}
                  className={`min-h-16 rounded-2xl border-4 font-jua text-2xl ${draft.action === "change" ? "border-coral bg-coral text-white" : "border-line bg-white"}`}
                >
                  바꿀래요
                </button>
              </div>
              {draft.action === "change" && (
                <ColorButtons value={draft.color} onPick={(c) => setDraft({ color: c })} disabled={mine.firstColor} />
              )}
              {draft.action && (
                <>
                  <textarea
                    className="field min-h-20 resize-none py-2 text-xl"
                    value={draft.reason}
                    maxLength={REASON_MAX}
                    onChange={(e) => setDraft({ reason: e.target.value })}
                    placeholder={draft.action === "change" ? "생각이 바뀐 이유 (꼭 써요)" : "그대로인 이유 (써도 되고 안 써도 돼요)"}
                    aria-label="이유"
                  />
                  <button
                    className="btn min-h-14 text-2xl"
                    onClick={save}
                    disabled={busy || (!dirty && !!saved) || (draft.action === "change" && (!draft.color || !draft.reason.trim()))}
                  >
                    {busy ? "저장 중…" : !dirty && saved ? "저장했어요 ✓" : "저장하기"}
                  </button>
                </>
              )}
              {msg && <p className="rounded-xl bg-bg p-2 text-center font-bold">{msg}</p>}
            </>
          )}
        </>
      }
      right={
        <>
          <div className="panel px-4 py-3">
            <ChangeBars opinions={board} />
          </div>
          <div className="min-h-0 flex-1">
            <OpinionBoard opinions={board} showChange />
          </div>
        </>
      }
    />
  );
}

/* ───────────── 나의 기준(다음 단계 기능) ───────────── */

export function CriteriaWait({ state }: { state: StudentState }) {
  const { card } = useOpenCards(state);
  return (
    <div className="flex h-full flex-col gap-3 p-3">
      <div className="panel p-4 text-center">
        <p className="font-jua text-4xl">오늘 색을 고를 때 나의 기준은 무엇이었나요?</p>
        <p className="mt-1 text-xl text-mute">선생님, 친구들과 함께 이야기해요.</p>
      </div>
      {card && (
        <div className="min-h-0 flex-1">
          <OpinionBoard opinions={state.opinions.filter((o) => o.cardId === card.id)} showChange />
        </div>
      )}
    </div>
  );
}
