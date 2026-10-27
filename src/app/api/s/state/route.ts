import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { activeDebate, canEditGroup, currentStudent, fail } from "@/lib/student-session";
import { toBoard, type BoardOpinion } from "@/lib/opinions";
import type { OpinionRow } from "@/lib/types";

const OPINION_PHASES = ["personal", "revote", "criteria"];

// 학생 화면에 필요한 것만 돌려준다. (다른 학생의 PIN·기록은 절대 넣지 않는다)
export async function GET() {
  const me = await currentStudent();
  if (!me) return fail(401, "다시 들어와요.");

  const debate = await activeDebate(me.class_id);
  const db = adminClient();

  let cards: { id: string; personal_open: boolean }[] = [];
  let groupVotes: unknown[] = [];
  let opinions: BoardOpinion[] = [];
  let myOpinions: BoardOpinion[] = [];

  if (debate) {
    const { data } = await db
      .from("sd_cards")
      .select("id, label, title, body, position, personal_open")
      .eq("debate_id", debate.id)
      .order("position");
    cards = data ?? [];

    if (debate.phase === "group" && me.group_no) {
      const { data: v } = await db
        .from("sd_group_votes")
        .select("card_id, color, reason, updated_at")
        .eq("debate_id", debate.id)
        .eq("group_no", me.group_no);
      groupVotes = v ?? [];
    }

    if (OPINION_PHASES.includes(debate.phase)) {
      const openIds = cards.filter((c) => c.personal_open).map((c) => c.id);
      const { data: rows } = await db
        .from("sd_opinions")
        .select("*")
        .eq("debate_id", debate.id)
        .order("created_at");
      const all = (rows as OpinionRow[]) ?? [];

      // 익명이면 이름·번호를 응답에서 아예 뺀다(화면에서만 숨기지 않기)
      const names = new Map<string, { name: string; number: number }>();
      if (debate.show_names) {
        const { data: st } = await db.from("sd_students").select("id, name, number").eq("class_id", me.class_id);
        for (const s of (st as { id: string; name: string; number: number }[]) ?? []) names.set(s.id, s);
      }

      opinions = all
        .filter((o) => !o.hidden && openIds.includes(o.card_id))
        .map((o) => ({ ...toBoard(o, names.get(o.student_id) ?? null), hidden: undefined, mine: o.student_id === me.id }));
      myOpinions = all
        .filter((o) => o.student_id === me.id)
        .map((o) => ({ ...toBoard(o, null), hidden: undefined, mine: true }));
    }
  }

  return NextResponse.json(
    {
      me: {
        number: me.number,
        name: me.name,
        groupNo: me.group_no,
        isLeader: me.is_group_leader,
        canEditGroup: canEditGroup(me),
      },
      debate: debate ? { id: debate.id, title: debate.title, phase: debate.phase, showNames: debate.show_names } : null,
      cards,
      groupVotes,
      opinions,
      myOpinions,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
