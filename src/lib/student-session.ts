import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { adminClient } from "./supabase/admin";

const COOKIE = "ts_student";
const MAX_AGE = 4 * 60 * 60; // 4시간

function secret() {
  const s = process.env.STUDENT_SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("STUDENT_SESSION_SECRET(32자 이상)이 필요합니다.");
  return new TextEncoder().encode(s);
}

export async function setStudentCookie(sid: string, cid: string) {
  const token = await new SignJWT({ cid })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(sid)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearStudentCookie() {
  (await cookies()).delete(COOKIE);
}

async function readSession(): Promise<{ sid: string; cid: string } | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    if (typeof payload.sub !== "string" || typeof payload.cid !== "string") return null;
    return { sid: payload.sub, cid: payload.cid };
  } catch {
    return null;
  }
}

export type SessionStudent = {
  id: string;
  class_id: string;
  number: number;
  name: string;
  group_no: number | null;
  is_group_leader: boolean;
};

/** 1) 쿠키 서명 2) 학생이 아직 존재하는지 확인. 실패하면 null */
export async function currentStudent(): Promise<SessionStudent | null> {
  const s = await readSession();
  if (!s) return null;
  const { data } = await adminClient()
    .from("sd_students")
    .select("id, class_id, number, name, group_no, is_group_leader")
    .eq("id", s.sid)
    .eq("class_id", s.cid)
    .maybeSingle();
  return (data as SessionStudent | null) ?? null;
}

export const fail = (status: number, message: string) =>
  NextResponse.json({ error: message }, { status });

export type ActiveDebate = { id: string; title: string; phase: string; show_names: boolean };

/** 학급에서 지금 진행 중인(draft·closed 아닌) 토론 */
export async function activeDebate(classId: string): Promise<ActiveDebate | null> {
  const { data } = await adminClient()
    .from("sd_debates")
    .select("id, title, phase, show_names")
    .eq("class_id", classId)
    .not("phase", "in", "(draft,closed)")
    .maybeSingle();
  return (data as ActiveDebate | null) ?? null;
}

/** 모둠 신호등을 입력할 수 있는지: 모둠 대표(또는 설정으로 모둠원 누구나) */
export const canEditGroup = (s: SessionStudent) =>
  !!s.group_no && (s.is_group_leader || process.env.ALLOW_ANY_GROUP_MEMBER === "true");
