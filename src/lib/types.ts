export type Color = "green" | "yellow" | "red";
export type YellowType = "condition" | "curious";
export type Phase = "draft" | "group" | "personal" | "revote" | "criteria" | "closed";

export const PHASES: { key: Phase; label: string }[] = [
  { key: "draft", label: "준비" },
  { key: "group", label: "모둠 신호등" },
  { key: "personal", label: "개인 의견" },
  { key: "revote", label: "다시 투표" },
  { key: "criteria", label: "나의 기준" },
  { key: "closed", label: "마감" },
];

export type ClassRow = {
  id: string;
  name: string;
  join_code: string;
  created_at: string;
};

export type StudentRow = {
  id: string;
  class_id: string;
  number: number;
  name: string;
  group_no: number | null;
  is_group_leader: boolean;
  failed_attempts: number;
  locked_until: string | null;
};

export type DebateRow = {
  id: string;
  class_id: string;
  title: string;
  phase: Phase;
  show_names: boolean;
  featured_opinion_id: string | null;
  created_at: string;
};

export type CardRow = {
  id: string;
  debate_id: string;
  label: string;
  title: string;
  body: string;
  position: number;
  personal_open: boolean;
};

export type GroupVoteRow = {
  id: string;
  debate_id: string;
  card_id: string;
  group_no: number;
  color: Color;
  reason: string;
  updated_at: string;
};

export type OpinionRow = {
  id: string;
  debate_id: string;
  card_id: string;
  student_id: string;
  first_color: Color;
  first_reason: string;
  yellow_type: YellowType | null;
  current_color: Color;
  change_reason: string | null;
  keep_reason: string | null;
  revoted: boolean;
  hidden: boolean;
  created_at: string;
  changed_at: string | null;
};

export const isPhase = (v: unknown): v is Phase => PHASES.some((p) => p.key === v);
