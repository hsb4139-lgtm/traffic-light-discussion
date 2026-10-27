"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Color, Phase } from "./types";
import type { BoardOpinion } from "./opinions";

export type StudentCard = { id: string; label: string; title: string; body: string; position: number; personal_open: boolean };
export type MyGroupVote = { card_id: string; color: Color; reason: string; updated_at: string };

export type StudentState = {
  me: { number: number; name: string; groupNo: number | null; isLeader: boolean; canEditGroup: boolean };
  debate: { id: string; title: string; phase: Phase; showNames: boolean } | null;
  cards: StudentCard[];
  groupVotes: MyGroupVote[];
  /** 열린 카드의 친구 의견(숨긴 글 제외, 익명이면 이름 없음) */
  opinions: BoardOpinion[];
  myOpinions: BoardOpinion[];
};

const INTERVAL = 3000;

/** /api/s/state 를 3초마다 부른다. 탭이 숨겨지면 멈추고, 보이면 바로 1번 부른다. */
export function useStudentState(onUnauthorized: () => void) {
  const [state, setState] = useState<StudentState | null>(null);
  const [offline, setOffline] = useState(false);
  const unauth = useRef(onUnauthorized);
  useEffect(() => {
    unauth.current = onUnauthorized;
  });

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/s/state", { cache: "no-store" });
      if (res.status === 401) return unauth.current();
      if (!res.ok) throw new Error(String(res.status));
      setState(await res.json());
      setOffline(false);
    } catch {
      setOffline(true);
    }
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    const start = () => {
      clearInterval(timer);
      refresh();
      timer = setInterval(refresh, INTERVAL);
    };
    const onVis = () => (document.hidden ? clearInterval(timer) : start());
    start();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [refresh]);

  return { state, offline, refresh };
}
