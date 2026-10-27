import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { adminClient } from "@/lib/supabase/admin";
import { normalizeCode } from "@/lib/codes";
import { fail, setStudentCookie } from "@/lib/student-session";

const MAX_FAILS = 5;
const LOCK_MINUTES = 5;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const code = normalizeCode(String(body?.code ?? ""));
  const number = Number(body?.number);
  const pin = String(body?.pin ?? "");
  if (code.length !== 6 || !Number.isInteger(number) || !/^\d{4}$/.test(pin)) {
    return fail(400, "코드, 번호, PIN 4자리를 확인해요.");
  }

  const db = adminClient();
  const { data: cls } = await db.from("sd_classes").select("id").eq("join_code", code).maybeSingle();
  if (!cls) return fail(404, "수업 코드를 다시 확인해요.");
  const classId = (cls as { id: string }).id;

  const { data: st } = await db
    .from("sd_students")
    .select("id, pin_hash, failed_attempts, locked_until")
    .eq("class_id", classId)
    .eq("number", number)
    .maybeSingle();
  if (!st) return fail(404, "번호를 다시 골라요.");
  const s = st as { id: string; pin_hash: string; failed_attempts: number; locked_until: string | null };

  if (s.locked_until && new Date(s.locked_until) > new Date()) {
    const min = Math.ceil((new Date(s.locked_until).getTime() - Date.now()) / 60000);
    return fail(423, `PIN을 여러 번 틀려서 잠겼어요. ${min}분 뒤에 다시 하거나 선생님께 말해요.`);
  }

  const ok = await bcrypt.compare(pin, s.pin_hash);
  if (!ok) {
    const fails = s.failed_attempts + 1;
    const lock = fails >= MAX_FAILS;
    await db
      .from("sd_students")
      .update({
        failed_attempts: lock ? 0 : fails,
        locked_until: lock ? new Date(Date.now() + LOCK_MINUTES * 60000).toISOString() : null,
      })
      .eq("id", s.id);
    if (lock) return fail(423, `PIN을 ${MAX_FAILS}번 틀려서 ${LOCK_MINUTES}분 동안 잠겼어요. 선생님께 말해요.`);
    return fail(401, `PIN이 달라요. (${fails}/${MAX_FAILS})`);
  }

  if (s.failed_attempts > 0 || s.locked_until) {
    await db.from("sd_students").update({ failed_attempts: 0, locked_until: null }).eq("id", s.id);
  }
  await setStudentCookie(s.id, classId);
  return NextResponse.json({ ok: true });
}
