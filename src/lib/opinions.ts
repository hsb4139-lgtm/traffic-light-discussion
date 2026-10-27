import type { Color, OpinionRow, YellowType } from "./types";

/** 게시판에 그리는 의견 한 장(학생 API·교사 화면 공통 모양) */
export type BoardOpinion = {
  id: string;
  cardId: string;
  firstColor: Color;
  currentColor: Color;
  reason: string;
  yellowType: YellowType | null;
  changeReason: string | null;
  keepReason: string | null;
  revoted: boolean;
  /** 익명이면 null */
  name: string | null;
  number: number | null;
  hidden?: boolean;
  mine?: boolean;
};

export const changed = (o: Pick<BoardOpinion, "firstColor" | "currentColor">) => o.firstColor !== o.currentColor;

export function toBoard(o: OpinionRow, who?: { name: string; number: number } | null): BoardOpinion {
  return {
    id: o.id,
    cardId: o.card_id,
    firstColor: o.first_color,
    currentColor: o.current_color,
    reason: o.first_reason,
    yellowType: o.yellow_type,
    changeReason: o.change_reason,
    keepReason: o.keep_reason,
    revoted: o.revoted,
    name: who?.name ?? null,
    number: who?.number ?? null,
    hidden: o.hidden,
  };
}

export function countBy(list: BoardOpinion[], key: "firstColor" | "currentColor"): Record<Color, number> {
  const c: Record<Color, number> = { green: 0, yellow: 0, red: 0 };
  for (const o of list) c[o[key]]++;
  return c;
}

/** 교사 진행판·전광판: 한 카드의 의견을 게시판 모양으로 */
export function boardOpinions(
  opinions: OpinionRow[],
  students: { id: string; name?: string; number?: number }[],
  cardId: string,
  { includeHidden, withNames }: { includeHidden: boolean; withNames: boolean },
): BoardOpinion[] {
  const who = new Map(students.map((s) => [s.id, s]));
  return opinions
    .filter((o) => o.card_id === cardId && (includeHidden || !o.hidden))
    .map((o) => {
      const s = who.get(o.student_id);
      return toBoard(o, withNames && s?.name ? { name: s.name, number: s.number ?? 0 } : null);
    });
}
