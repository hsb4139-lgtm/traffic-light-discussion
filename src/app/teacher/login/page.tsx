"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Lights, Logo } from "@/components/Logo";

const ALLOW_SIGNUP = process.env.NEXT_PUBLIC_ALLOW_SIGNUP === "true";

function LoginForm() {
  const router = useRouter();
  const next = useSearchParams().get("next") || "/teacher";
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    const supabase = createClient();
    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setMsg("이메일이나 비밀번호를 다시 확인해 주세요.");
        setBusy(false);
        return;
      }
      router.replace(next.startsWith("/") ? next : "/teacher");
      router.refresh();
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password });
      setBusy(false);
      if (error) return setMsg(`가입하지 못했어요: ${error.message}`);
      if (!data.session) return setMsg("확인 메일을 보냈어요. 메일의 링크를 누른 뒤 로그인해 주세요.");
      router.replace("/teacher");
      router.refresh();
    }
  }

  return (
    <form onSubmit={submit} className="panel flex w-full max-w-md flex-col gap-3 p-8">
      <h1 className="font-jua text-3xl text-blue">{mode === "login" ? "선생님 로그인" : "선생님 가입(처음 1번)"}</h1>
      <label className="text-sm text-mute" htmlFor="email">이메일</label>
      <input id="email" className="field" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      <label className="text-sm text-mute" htmlFor="pw">비밀번호</label>
      <input id="pw" className="field" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} />
      {msg && <p className="rounded-xl bg-wait-bg p-3 font-semibold text-wait-ink">{msg}</p>}
      <button className="btn mt-2 text-lg" disabled={busy}>
        {busy ? "잠시만요…" : mode === "login" ? "로그인" : "가입하기"}
      </button>
      {ALLOW_SIGNUP && (
        <button type="button" className="text-sm text-mute underline" onClick={() => setMode(mode === "login" ? "signup" : "login")}>
          {mode === "login" ? "처음이신가요? 가입하기" : "이미 가입했어요. 로그인하기"}
        </button>
      )}
    </form>
  );
}

export default function TeacherLogin() {
  return (
    <main className="grid h-full grid-cols-1 md:grid-cols-2">
      <section className="hidden flex-col items-center justify-center gap-5 bg-white md:flex">
        <Lights size={64} />
        <Logo size="text-5xl" />
      </section>
      <section className="flex items-center justify-center p-6">
        <Suspense>
          <LoginForm />
        </Suspense>
      </section>
    </main>
  );
}
