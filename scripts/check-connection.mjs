// Supabase 연결 점검: node scripts/check-connection.mjs
// 키 값은 출력하지 않는다.
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]),
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const admin = createClient(url, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const pub = createClient(url, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });

let failed = 0;
const say = (ok, msg) => {
  if (!ok) failed++;
  console.log(`${ok ? "✓" : "✗"} ${msg}`);
};

const tables = ["sd_classes", "sd_students", "sd_debates", "sd_cards", "sd_group_votes", "sd_opinions", "sd_criteria"];
for (const t of tables) {
  const { data, count, error, status } = await admin.from(t).select("id", { count: "exact" }).limit(1);
  const ok = !error && Array.isArray(data) && typeof count === "number";
  say(ok, `서버 키로 ${t} 읽기${ok ? ` (${count}줄)` : ` — HTTP ${status} ${error?.message ?? "응답 없음"}`}`);
}

// 공개 키(로그인 안 함)로는 학생 표가 보이면 안 된다
const { data, error } = await pub.from("sd_students").select("id").limit(1);
say(!!error || (data ?? []).length === 0, `공개 키로는 학생 표가 안 보임${error ? ` (막힘)` : ` (0줄)`}`);

const { error: authErr } = await pub.auth.getSession();
say(!authErr, "로그인 서비스 연결");

console.log(failed ? `\n문제 ${failed}개` : "\n연결 정상");
process.exit(failed ? 1 : 0);
