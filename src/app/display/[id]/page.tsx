"use client";

import { useParams } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { useDebateLive, type DebateLive } from "@/lib/useDebateLive";
import { boardOpinions } from "@/lib/opinions";
import { PHASES } from "@/lib/types";
import { GroupBoard } from "@/components/GroupBoard";
import { ChangeBars, FeaturedOverlay, OpinionBoard } from "@/components/OpinionBoard";
import { Lights, Logo } from "@/components/Logo";

const noop = () => () => {};
const useHost = () => useSyncExternalStore(noop, () => window.location.host, () => "");

export default function Display() {
  const { id } = useParams<{ id: string }>();
  const { data, error, connected } = useDebateLive(id, { display: true });

  if (error) return <p className="p-8 text-2xl text-stop">{error}</p>;
  if (!data) return <p className="p-8 text-2xl text-mute">불러오는 중…</p>;

  const { debate } = data;

  return (
    <main className="flex h-screen w-screen flex-col overflow-hidden bg-bg">
      <header className="flex items-center gap-4 border-b-2 border-line bg-white px-5 py-2">
        <Logo size="text-3xl" />
        <h1 className="truncate font-jua text-3xl">{debate.title}</h1>
        <div className="flex-1" />
        <span className="rounded-full bg-blue px-4 py-1 font-jua text-2xl text-white">
          {PHASES.find((p) => p.key === debate.phase)?.label}
        </span>
        {!connected && <span className="h-3 w-3 animate-pulse rounded-full bg-stop" title="다시 연결 중" />}
        <button
          className="rounded-lg px-2 text-2xl text-mute"
          title="전체 화면"
          onClick={() => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen())}
        >
          ⛶
        </button>
      </header>
      <div className="min-h-0 flex-1 p-4">
        <Stage data={data} />
      </div>
    </main>
  );
}

function Stage({ data }: { data: DebateLive }) {
  const host = useHost();
  const { debate, cls, cards, votes, groups } = data;

  switch (debate.phase) {
    case "draft":
      return (
        <div className="grid h-full grid-cols-2 items-center gap-8">
          <div className="flex flex-col items-center gap-6">
            <Lights size={110} />
            <p className="text-center font-jua text-6xl leading-tight">{debate.title}</p>
          </div>
          <div className="panel flex flex-col items-center gap-4 p-10">
            <p className="text-3xl text-mute">태블릿에서 들어와요</p>
            <p className="font-jua text-4xl text-blue">{host}/s</p>
            <p className="mt-4 text-3xl text-mute">수업 코드</p>
            <p className="font-jua text-[9rem] leading-none tracking-[0.15em] text-coral">{cls.join_code}</p>
          </div>
        </div>
      );
    case "group":
      return <GroupBoard cards={cards} votes={votes} groups={groups} big />;
    case "personal":
    case "revote":
    case "criteria":
      return <OpinionStage data={data} />;
    default:
      return (
        <div className="grid h-full place-items-center text-center">
          <div className="flex flex-col items-center gap-6">
            <Lights size={110} />
            <p className="font-jua text-7xl">오늘 토론 끝! 수고했어요 👏</p>
          </div>
        </div>
      );
  }
}

function OpinionStage({ data }: { data: DebateLive }) {
  const { debate, cards, opinions, students } = data;
  const open = cards.filter((c) => c.personal_open);
  const [pickedId, setPickedId] = useState<string | null>(null);
  const card = open.find((c) => c.id === pickedId) ?? open[0];

  if (!card) {
    return (
      <div className="grid h-full place-items-center">
        <p className="font-jua text-5xl text-mute">선생님이 카드를 열면 의견이 모여요.</p>
      </div>
    );
  }

  const showChange = debate.phase !== "personal";
  const board = boardOpinions(opinions, students, card.id, { includeHidden: false, withNames: debate.show_names });
  const featured = board.find((o) => o.id === debate.featured_opinion_id);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center gap-4">
        {open.length > 1 &&
          open.map((c) => (
            <button
              key={c.id}
              onClick={() => setPickedId(c.id)}
              className={`rounded-2xl px-4 py-2 font-jua text-2xl ${c.id === card.id ? "bg-coral text-white" : "bg-white text-mute"}`}
            >
              {c.label}
            </button>
          ))}
        <p className="font-jua text-4xl">
          <span className="text-coral">{card.label}</span> {card.title}
        </p>
        <div className="flex-1" />
        <span className="font-jua text-3xl text-mute">의견 {board.length}개</span>
      </div>
      {showChange && (
        <div className="panel px-6 py-3">
          <ChangeBars opinions={board} big />
        </div>
      )}
      <div className="min-h-0 flex-1">
        <OpinionBoard opinions={board} big showChange={showChange} />
      </div>
      {featured && <FeaturedOverlay o={featured} showChange={showChange} />}
    </div>
  );
}
