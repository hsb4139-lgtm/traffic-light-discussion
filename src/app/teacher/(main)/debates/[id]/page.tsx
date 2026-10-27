"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useDebateLive } from "@/lib/useDebateLive";
import { cardSpreads, mostDividedId } from "@/lib/divided";
import { boardOpinions, type BoardOpinion } from "@/lib/opinions";
import { PHASES, type CardRow, type Phase } from "@/lib/types";
import { GroupBoard } from "@/components/GroupBoard";
import { ChangeBars, OpinionBoard } from "@/components/OpinionBoard";

type View = "group" | "opinions";

export default function ControlBoard() {
  const { id } = useParams<{ id: string }>();
  const { data, error, connected, reload } = useDebateLive(id);
  const [msg, setMsg] = useState("");
  const [viewPick, setViewPick] = useState<View | null>(null);
  const [cardPick, setCardPick] = useState<string | null>(null);

  if (error) return <p className="p-8 text-stop">{error}</p>;
  if (!data) return <p className="p-8 text-mute">불러오는 중…</p>;

  const { debate, cls, cards, votes, groups, opinions, students } = data;
  const phaseIdx = PHASES.findIndex((p) => p.key === debate.phase);
  const divided = mostDividedId(cardSpreads(cards, votes, groups.length));
  const opinionPhase = ["personal", "revote", "criteria"].includes(debate.phase);
  const view: View = viewPick ?? (opinionPhase ? "opinions" : "group");
  const showChange = debate.phase === "revote" || debate.phase === "criteria";

  const openCards = cards.filter((c) => c.personal_open);
  const card = openCards.find((c) => c.id === cardPick) ?? openCards[0];
  const board = card ? boardOpinions(opinions, students, card.id, { includeHidden: true, withNames: true }) : [];

  const db = () => createClient();

  async function setPhase(phase: Phase) {
    setMsg("");
    setViewPick(null);
    if (phase === "personal" && !openCards.length) {
      setMsg("💡 오른쪽에서 개인 의견을 받을 카드를 먼저 열어 주세요.");
    }
    const { error } = await db().from("sd_debates").update({ phase, featured_opinion_id: null }).eq("id", id);
    if (error) {
      setMsg(
        error.code === "23505"
          ? "다른 토론이 진행 중이에요. 그 토론을 ‘마감’하거나 ‘준비’로 돌린 뒤 시작해 주세요."
          : `바꾸지 못했어요: ${error.message}`,
      );
    }
    reload();
  }

  async function toggleOpen(c: CardRow) {
    await db().from("sd_cards").update({ personal_open: !c.personal_open }).eq("id", c.id);
    reload();
  }

  async function toggleNames() {
    await db().from("sd_debates").update({ show_names: !debate.show_names }).eq("id", id);
    reload();
  }

  async function feature(o: BoardOpinion | null) {
    await db().from("sd_debates").update({ featured_opinion_id: o?.id ?? null }).eq("id", id);
    reload();
  }

  async function toggleHidden(o: BoardOpinion) {
    await db().from("sd_opinions").update({ hidden: !o.hidden }).eq("id", o.id);
    if (!o.hidden && debate.featured_opinion_id === o.id) await feature(null);
    reload();
  }

  const featured = opinions.find((o) => o.id === debate.featured_opinion_id);

  // 아직 안 쓴 학생 번호
  const written = new Map(opinions.filter((o) => o.card_id === card?.id).map((o) => [o.student_id, o]));
  const notWritten = students.filter((s) => !written.has(s.id));
  const notRevoted = students.filter((s) => written.has(s.id) && !written.get(s.id)!.revoted);

  return (
    <div className="flex h-full flex-col gap-3 p-3">
      {/* 단계 버튼 */}
      <div className="panel flex flex-wrap items-center gap-2 p-3">
        <Link href="/teacher" className="px-2 text-mute">
          ←
        </Link>
        <h1 className="mr-2 max-w-[28ch] truncate font-jua text-2xl">{debate.title}</h1>
        <span className={`h-3 w-3 rounded-full ${connected ? "bg-go" : "animate-pulse bg-stop"}`} title={connected ? "실시간 연결됨" : "연결 중…"} />
        <div className="flex flex-1 flex-wrap justify-center gap-1.5">
          {PHASES.map((p, i) => (
            <button
              key={p.key}
              onClick={() => setPhase(p.key)}
              className={`min-h-12 rounded-2xl px-4 font-jua text-lg transition active:scale-95 ${
                p.key === debate.phase ? "bg-blue text-white shadow-lg" : i < phaseIdx ? "bg-go-bg text-go" : "border-2 border-line bg-white text-mute"
              }`}
            >
              {i + 1}. {p.label}
            </button>
          ))}
        </div>
        <Link href={`/teacher/debates/${id}/edit`} className="btn-ghost btn-sm">
          편집
        </Link>
        <a href={`/display/${id}`} target="_blank" rel="noopener" className="btn btn-sm">
          📺 전광판 열기
        </a>
      </div>

      {msg && <p className="rounded-xl bg-wait-bg px-4 py-2 font-semibold text-wait-ink">{msg}</p>}

      <div className="grid min-h-0 flex-1 grid-cols-[1fr_320px] gap-3">
        <section className="panel flex min-h-0 flex-col gap-3 p-4">
          <div className="flex flex-wrap items-center gap-2">
            {(["group", "opinions"] as View[]).map((v) => (
              <button
                key={v}
                onClick={() => setViewPick(v)}
                className={`rounded-xl px-4 py-2 font-bold ${view === v ? "bg-ink text-white" : "bg-bg text-mute"}`}
              >
                {v === "group" ? "모둠 신호등표" : "개인 의견"}
              </button>
            ))}
            {view === "opinions" && (
              <>
                <span className="mx-2 h-6 w-px bg-line" />
                {openCards.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setCardPick(c.id)}
                    className={`rounded-xl px-3 py-2 font-jua text-lg ${c.id === card?.id ? "bg-coral text-white" : "bg-bg text-mute"}`}
                  >
                    {c.label} {c.title}
                  </button>
                ))}
              </>
            )}
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-3">
            {view === "group" ? (
              <GroupBoard cards={cards} votes={votes} groups={groups} />
            ) : !card ? (
              <p className="p-8 text-center text-mute">오른쪽에서 개인 의견 카드를 열어 주세요.</p>
            ) : (
              <>
                {showChange && <ChangeBars opinions={board} />}
                <div className="min-h-0 flex-1">
                  <OpinionBoard
                    opinions={board}
                    showChange={showChange}
                    actions={(o) => (
                      <>
                        <button
                          className={`rounded-lg px-2 py-1 font-bold ${debate.featured_opinion_id === o.id ? "bg-blue text-white" : "bg-bg text-blue"}`}
                          onClick={() => feature(debate.featured_opinion_id === o.id ? null : o)}
                          disabled={o.hidden}
                        >
                          {debate.featured_opinion_id === o.id ? "크게 보는 중" : "크게"}
                        </button>
                        <button className="rounded-lg bg-bg px-2 py-1 font-bold text-stop" onClick={() => toggleHidden(o)}>
                          {o.hidden ? "보이기" : "숨기기"}
                        </button>
                      </>
                    )}
                  />
                </div>
              </>
            )}
          </div>
        </section>

        <aside className="flex min-h-0 flex-col gap-3 overflow-auto">
          {featured && (
            <div className="panel border-blue p-4">
              <p className="font-bold text-blue">📺 전광판에 크게 보는 중</p>
              <p className="my-2 line-clamp-3">{featured.first_reason}</p>
              <button className="btn btn-sm w-full" onClick={() => feature(null)}>
                크게 보기 끄기
              </button>
            </div>
          )}

          {opinionPhase && card && (
            <div className="panel p-4">
              <h2 className="font-jua text-xl">
                카드 {card.label} · {debate.phase === "revote" ? "아직 다시 투표 안 한 학생" : "아직 안 쓴 학생"}
              </h2>
              <NumberChips list={debate.phase === "revote" ? notRevoted : notWritten} />
              {debate.phase === "revote" && notWritten.length > 0 && (
                <p className="mt-2 text-sm text-mute">처음 의견이 없는 학생: {notWritten.map((s) => s.number).join(", ")}</p>
              )}
            </div>
          )}

          {!opinionPhase && (
            <div className="panel p-4">
              <p className="text-sm text-mute">수업 코드</p>
              <p className="font-jua text-4xl tracking-widest text-blue">{cls.join_code}</p>
            </div>
          )}

          {debate.phase === "group" && (
            <div className="panel p-4">
              <h2 className="mb-2 font-jua text-xl">모둠 입력 현황</h2>
              <ul className="flex flex-col gap-1">
                {groups.map((g) => {
                  const done = cards.filter((c) => votes.some((v) => v.card_id === c.id && v.group_no === g));
                  const missing = cards.filter((c) => !done.includes(c)).map((c) => c.label);
                  const leader = students.find((s) => s.group_no === g && s.is_group_leader);
                  return (
                    <li key={g} className="flex items-center gap-2">
                      <span className="w-14 font-bold">{g}모둠</span>
                      <span className={`rounded-full px-2 text-sm font-bold ${missing.length ? "bg-wait-bg text-wait-ink" : "bg-go-bg text-go"}`}>
                        {done.length}/{cards.length}
                      </span>
                      <span className="truncate text-sm text-mute">
                        {missing.length ? `${missing.join("·")} 아직` : "다 했어요"}
                        {!leader && " · 대표 없음!"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <div className="panel p-4">
            <h2 className="font-jua text-xl">개인 의견 카드 열기</h2>
            <p className="mb-2 text-sm text-mute">모둠 결과를 보고 1~2장만 열어요.</p>
            <ul className="flex flex-col gap-2">
              {cards.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => toggleOpen(c)}
                    className={`flex w-full items-center gap-2 rounded-xl border-2 px-3 py-2 text-left ${c.personal_open ? "border-blue bg-blue text-white" : "border-line bg-white"}`}
                  >
                    <span className="font-jua text-lg">{c.label}</span>
                    <span className="flex-1 truncate">{c.title}</span>
                    {c.id === divided && <span className="rounded-full bg-coral px-2 text-xs font-bold text-white">추천</span>}
                    <span className="text-sm font-bold">{c.personal_open ? "열림" : "닫힘"}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="panel p-4">
            <button
              onClick={toggleNames}
              className={`w-full rounded-xl border-2 px-3 py-2 font-bold ${debate.show_names ? "border-coral bg-stop-bg text-stop" : "border-line"}`}
            >
              {debate.show_names ? "👤 이름 공개 중 (누르면 익명)" : "🙈 익명 (누르면 이름 공개)"}
            </button>
            <p className="mt-1 text-xs text-mute">선생님 화면에는 항상 이름이 보여요.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function NumberChips({ list }: { list: { id: string; number: number; name: string }[] }) {
  if (!list.length) return <p className="mt-2 font-bold text-go">모두 했어요 ✓</p>;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {list.map((s) => (
        <span key={s.id} title={s.name} className="grid h-9 min-w-9 place-items-center rounded-lg bg-wait-bg px-1 font-jua text-lg text-wait-ink">
          {s.number}
        </span>
      ))}
    </div>
  );
}
