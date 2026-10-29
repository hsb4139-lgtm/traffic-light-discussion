"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SignalLight } from "@/components/student/SignalLight";
import { Lights, Logo } from "@/components/Logo";
import { useStudentState } from "@/lib/useStudentState";
import { GroupSignal } from "@/components/student/GroupSignal";
import { CriteriaWait, PersonalOpinion, Revote } from "@/components/student/OpinionScreens";

export default function StudentDebate() {
  const router = useRouter();
  const [lightOpen, setLightOpen] = useState(false);
  const { state, offline, refresh } = useStudentState(() => router.replace("/s"));

  async function logout() {
    await fetch("/api/s/logout", { method: "POST" });
    router.replace("/s");
  }

  const me = state?.me;
  const phase = state?.debate?.phase;

  return (
    <main className="flex h-full flex-col">
      <header className="flex items-center gap-3 border-b-2 border-line bg-white px-4 py-2">
        <Logo />
        <span className="truncate font-jua text-xl">{state?.debate?.title}</span>
        <div className="flex-1" />
        {offline && <span className="rounded-full bg-stop-bg px-3 py-1 text-sm font-bold text-stop">연결이 끊겼어요…</span>}
        <button className="btn btn-sm" onClick={() => setLightOpen(true)}>
          🚦 내 의견 표현하기
        </button>
        {me && (
          <span className="rounded-full bg-bg px-4 py-1.5 font-bold">
            {me.number}번 {me.name}
            {me.groupNo && ` · ${me.groupNo}모둠`}
            {me.isLeader && " ★대표"}
          </span>
        )}
        <button className="btn-ghost btn-sm" onClick={logout}>
          나가기
        </button>
      </header>

      <div className="min-h-0 flex-1">
        {!state ? (
          <p className="p-8 text-mute">불러오는 중…</p>
        ) : !phase ? (
          <Waiting />
        ) : phase === "group" ? (
          <GroupSignal state={state} refresh={refresh} />
        ) : phase === "personal" ? (
          <PersonalOpinion state={state} refresh={refresh} />
        ) : phase === "revote" ? (
          <Revote state={state} refresh={refresh} />
        ) : phase === "criteria" ? (
          <CriteriaWait state={state} />
        ) : (
          <Waiting />
        )}
      </div>
      {lightOpen && <SignalLight onClose={() => setLightOpen(false)} />}
    </main>
  );
}

function Waiting() {
  return (
    <div className="grid h-full place-items-center text-center">
      <div className="flex flex-col items-center gap-6">
        <div className="animate-pulse">
          <Lights size={80} />
        </div>
        <p className="font-jua text-5xl">잠깐 기다려요</p>
        <p className="text-2xl text-mute">선생님이 시작하면 화면이 저절로 바뀌어요.</p>
      </div>
    </div>
  );
}
