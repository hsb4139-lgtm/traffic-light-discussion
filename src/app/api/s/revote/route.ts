import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { activeDebate, currentStudent, fail } from "@/lib/student-session";
import { isColor } from "@/lib/signal";

// 다시 투표: 처음 색(first_*)은 절대 바꾸지 않는다.
export async function POST(req: NextRequest) {
  const me = await currentStudent();
  if (!me) return fail(401, "다시 들어와요.");
  const debate = await activeDebate(me.class_id);
  if (!debate || debate.phase !== "revote") return fail(409, "지금은 다시 투표 시간이 아니에요.");

  const body = await req.json().catch(() => null);
  const cardId = String(body?.cardId ?? "");
  const action = body?.action;
  const reason = String(body?.reason ?? "").trim().slice(0, 100);
  if (action !== "keep" && action !== "change") return fail(400, "‘그대로’나 ‘바꿀래요’를 골라요.");

  const db = adminClient();
  const { data: op } = await db
    .from("sd_opinions")
    .select("id, first_color")
    .eq("card_id", cardId)
    .eq("student_id", me.id)
    .eq("debate_id", debate.id)
    .maybeSingle();
  if (!op) return fail(404, "처음 의견이 없어서 다시 투표할 수 없어요.");
  const first = (op as { id: string; first_color: string }).first_color;

  let patch;
  if (action === "change") {
    const color = body?.color;
    if (!isColor(color)) return fail(400, "새 색을 골라요.");
    if (color === first) return fail(400, "처음과 같은 색이에요. ‘그대로’를 눌러요.");
    if (!reason) return fail(400, "생각이 바뀐 이유를 꼭 써요.");
    patch = { current_color: color, change_reason: reason, keep_reason: null };
  } else {
    patch = { current_color: first, change_reason: null, keep_reason: reason || null };
  }

  const { error } = await db
    .from("sd_opinions")
    .update({ ...patch, revoted: true, changed_at: new Date().toISOString() })
    .eq("id", (op as { id: string }).id);
  if (error) return fail(500, "저장하지 못했어요. 다시 눌러 봐요.");
  return NextResponse.json({ ok: true });
}
