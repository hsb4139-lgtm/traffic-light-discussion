import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// service_role 키는 이 파일(서버 전용)에서만 읽는다. 학생 API(/api/s/*)에서만 사용.
let admin: SupabaseClient | null = null;

export function adminClient() {
  if (!admin) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Supabase 서버 환경 변수가 없습니다.");
    admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  }
  return admin;
}
