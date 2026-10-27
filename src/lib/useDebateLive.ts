"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "./supabase/client";
import type { CardRow, ClassRow, DebateRow, GroupVoteRow, OpinionRow, StudentRow } from "./types";

export type DebateLive = {
  debate: DebateRow;
  cls: ClassRow;
  cards: CardRow[];
  votes: GroupVoteRow[];
  opinions: OpinionRow[];
  students: StudentRow[];
  /** 학생이 배정된 모둠 번호들(오름차순) */
  groups: number[];
};

const SAFETY_POLL = 15000;

/**
 * 교사 진행판·전광판용. 처음 전체를 불러오고, Realtime 변경이 오면 다시 불러온다.
 * 연결이 끊기면 재구독하고 전체를 다시 불러온다. (만일을 위해 15초마다도 다시 불러옴)
 */
export function useDebateLive(debateId: string, { display = false }: { display?: boolean } = {}) {
  const [data, setData] = useState<DebateLive | null>(null);
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(false);
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    const db = createClient();
    const { data: debate, error } = await db.from("sd_debates").select("*").eq("id", debateId).maybeSingle();
    if (error || !debate) {
      setError(error?.message ?? "토론을 찾을 수 없어요.");
      return;
    }
    const d = debate as DebateRow;
    const [cls, cards, votes, opinions, students] = await Promise.all([
      db.from("sd_classes").select("id, name, join_code, created_at").eq("id", d.class_id).single(),
      db.from("sd_cards").select("*").eq("debate_id", debateId).order("position"),
      db.from("sd_group_votes").select("*").eq("debate_id", debateId),
      db.from("sd_opinions").select("*").eq("debate_id", debateId).order("created_at"),
      db
        .from("sd_students")
        // 전광판은 익명이면 이름·번호를 아예 불러오지 않는다
        .select(
          display && !d.show_names
            ? "id, class_id, group_no, is_group_leader"
            : "id, class_id, number, name, group_no, is_group_leader, failed_attempts, locked_until",
        )
        .eq("class_id", d.class_id)
        .order("number"),
    ]);
    const studentRows = (students.data as unknown as StudentRow[]) ?? [];
    const groups = [...new Set(studentRows.map((s) => s.group_no).filter((g): g is number => !!g))].sort((a, b) => a - b);
    setData({
      debate: d,
      cls: cls.data as ClassRow,
      cards: (cards.data as CardRow[]) ?? [],
      votes: (votes.data as GroupVoteRow[]) ?? [],
      opinions: (opinions.data as OpinionRow[]) ?? [],
      students: studentRows,
      groups,
    });
    setError("");
  }, [debateId, display]);

  // 변경이 한꺼번에 몰려도 한 번만 불러오기
  const schedule = useCallback(() => {
    if (pending.current) clearTimeout(pending.current);
    pending.current = setTimeout(load, 150);
  }, [load]);

  useEffect(() => {
    const db = createClient();
    let channel: ReturnType<typeof db.channel> | null = null;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let alive = true;

    const subscribe = () => {
      const filter = `debate_id=eq.${debateId}`;
      channel = db
        .channel(`debate-${debateId}-${Date.now()}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "sd_debates", filter: `id=eq.${debateId}` }, schedule)
        .on("postgres_changes", { event: "*", schema: "public", table: "sd_cards", filter }, schedule)
        .on("postgres_changes", { event: "*", schema: "public", table: "sd_group_votes", filter }, schedule)
        .on("postgres_changes", { event: "*", schema: "public", table: "sd_opinions", filter }, schedule)
        .subscribe((status) => {
          if (!alive) return;
          if (status === "SUBSCRIBED") {
            setConnected(true);
            load();
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
            setConnected(false);
            if (channel) db.removeChannel(channel);
            channel = null;
            clearTimeout(retry);
            retry = setTimeout(subscribe, 2000);
          }
        });
    };

    subscribe();
    const poll = setInterval(load, SAFETY_POLL);
    return () => {
      alive = false;
      clearTimeout(retry);
      clearInterval(poll);
      if (channel) db.removeChannel(channel);
    };
  }, [debateId, load, schedule]);

  return { data, error, connected, reload: load };
}
