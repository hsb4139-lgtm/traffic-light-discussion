import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { activeDebate, currentStudent, fail } from "@/lib/student-session";
import { isColor } from "@/lib/signal";

// 개인 의견 올리기·고쳐 쓰기 (personal 단계, 열린 카드만, 카드 1장당 1개)
export async function PUT(req: NextRequest) {
  const me = await currentStudent();
  if (!me) return fail(401, "다시 들어와요.");
  const debate = await activeDebate(me.class_id);
  if (!debate || debate.phase !== "personal") return fail(409, "지금은 개인 의견 시간이 아니에요.");

  const body = await req.json().catch(() => null);
  const cardId = String(body?.cardId ?? "");
  const color = body?.color;
  const reason = String(body?.reason ?? "").trim().slice(0, 100);
  if (!isColor(color)) return fail(400, "색을 골라요.");
  if (!reason) return fail(400, "이유를 한 줄 써요.");
  const yellowType = color === "yellow" ? (body?.yellowType === "curious" ? "curious" : "condition") : null;

  const db = adminClient();
  const { data: card } = await db
    .from("sd_cards")
    .select("id, personal_open")
    .eq("id", cardId)
    .eq("debate_id", debate.id)
    .maybeSingle();
  if (!card || !(card as { personal_open: boolean }).personal_open) return fail(403, "이 카드는 아직 열리지 않았어요.");

  const { error } = await db.from("sd_opinions").upsert(
    {
      debate_id: debate.id,
      card_id: cardId,
      student_id: me.id,
      first_color: color,
      first_reason: reason,
      yellow_type: yellowType,
      current_color: color,
      change_reason: null,
      keep_reason: null,
      revoted: false,
      changed_at: null,
    },
    { onConflict: "card_id,student_id" },
  );
  if (error) return fail(500, "저장하지 못했어요. 다시 눌러 봐요.");
  return NextResponse.json({ ok: true });
}
