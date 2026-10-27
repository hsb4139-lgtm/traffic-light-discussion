import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { activeDebate, canEditGroup, currentStudent, fail } from "@/lib/student-session";
import { isColor } from "@/lib/signal";

export async function PUT(req: NextRequest) {
  const me = await currentStudent();
  if (!me) return fail(401, "다시 들어와요.");
  const debate = await activeDebate(me.class_id);
  if (!debate || debate.phase !== "group") return fail(409, "지금은 모둠 신호등 시간이 아니에요.");
  if (!me.group_no) return fail(403, "모둠이 정해지지 않았어요. 선생님께 말해요.");
  if (!canEditGroup(me)) return fail(403, "모둠 대표만 입력할 수 있어요.");

  const body = await req.json().catch(() => null);
  const cardId = String(body?.cardId ?? "");
  const color = body?.color;
  const reason = String(body?.reason ?? "").trim().slice(0, 100);
  if (!isColor(color)) return fail(400, "색을 골라요.");

  const db = adminClient();
  const { data: card } = await db.from("sd_cards").select("id").eq("id", cardId).eq("debate_id", debate.id).maybeSingle();
  if (!card) return fail(404, "카드를 찾을 수 없어요.");

  const { error } = await db.from("sd_group_votes").upsert(
    {
      debate_id: debate.id,
      card_id: cardId,
      group_no: me.group_no,
      color,
      reason,
      updated_by: me.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "card_id,group_no" },
  );
  if (error) return fail(500, "저장하지 못했어요. 다시 눌러 봐요.");
  return NextResponse.json({ ok: true });
}
