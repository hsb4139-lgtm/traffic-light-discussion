import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { normalizeCode } from "@/lib/codes";
import { fail } from "@/lib/student-session";

// 수업 코드로 번호 목록만 돌려준다(이름·PIN 없음)
export async function GET(req: NextRequest) {
  const code = normalizeCode(req.nextUrl.searchParams.get("code") ?? "");
  if (code.length !== 6) return fail(400, "수업 코드 6자리를 입력해요.");

  const db = adminClient();
  const { data: cls } = await db.from("sd_classes").select("id, name").eq("join_code", code).maybeSingle();
  if (!cls) return fail(404, "수업 코드를 다시 확인해요.");

  const { data: rows } = await db
    .from("sd_students")
    .select("number")
    .eq("class_id", (cls as { id: string }).id)
    .order("number");

  return NextResponse.json({
    className: (cls as { name: string }).name,
    numbers: ((rows ?? []) as { number: number }[]).map((r) => r.number),
  });
}
