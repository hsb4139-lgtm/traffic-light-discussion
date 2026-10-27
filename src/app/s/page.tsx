"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Lights, Logo } from "@/components/Logo";
import { normalizeCode } from "@/lib/codes";

type Step = "code" | "number" | "pin";
const LAST_CODE = "ts_last_code";
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];
const STEPS: [Step, string][] = [
  ["code", "수업 코드"],
  ["number", "내 번호"],
  ["pin", "PIN"],
];

export default function StudentJoin() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("code");
  const [code, setCode] = useState("");
  const [className, setClassName] = useState("");
  const [numbers, setNumbers] = useState<number[]>([]);
  const [number, setNumber] = useState<number | null>(null);
  const [pin, setPin] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // 이미 들어와 있으면 바로 토론 화면으로
    fetch("/api/s/state", { cache: "no-store" }).then((r) => {
      if (r.ok) router.replace("/s/debate");
    });
    try {
      const saved = localStorage.getItem(LAST_CODE);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 저장해 둔 코드 채우기
      if (saved) setCode(saved);
    } catch {}
  }, [router]);

  async function submitCode(e: React.FormEvent) {
    e.preventDefault();
    const c = normalizeCode(code);
    if (c.length !== 6) return setMsg("수업 코드 6자리를 넣어요.");
    setBusy(true);
    setMsg("");
    const res = await fetch(`/api/s/roster?code=${c}`);
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setMsg(data.error ?? "다시 해 봐요.");
    try {
      localStorage.setItem(LAST_CODE, c);
    } catch {}
    setClassName(data.className);
    setNumbers(data.numbers);
    setStep("number");
  }

  async function submitPin(p: string) {
    setBusy(true);
    setMsg("");
    const res = await fetch("/api/s/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: normalizeCode(code), number, pin: p }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) return router.replace("/s/debate");
    setBusy(false);
    setPin("");
    setMsg(data.error ?? "다시 해 봐요.");
  }

  function press(d: string) {
    if (busy) return;
    if (d === "⌫") return setPin((p) => p.slice(0, -1));
    const next = (pin + d).slice(0, 4);
    setPin(next);
    if (next.length === 4) submitPin(next);
  }

  return (
    <main className="grid h-full grid-cols-[minmax(240px,1fr)_2.4fr]">
      <aside className="flex flex-col items-center justify-center gap-6 border-r-2 border-line bg-white p-6">
        <Lights size={52} />
        <Logo size="text-4xl" />
        <ol className="flex w-full max-w-60 flex-col gap-2">
          {STEPS.map(([k, label], i) => (
            <li key={k} className={`rounded-2xl px-4 py-3 font-jua text-xl ${step === k ? "bg-blue text-white" : "bg-bg text-mute"}`}>
              {i + 1}. {label}
            </li>
          ))}
        </ol>
      </aside>

      <section className="flex min-h-0 flex-col items-center justify-center gap-5 overflow-auto p-6">
        {step === "code" && (
          <form onSubmit={submitCode} className="flex w-full max-w-xl flex-col items-center gap-5">
            <h1 className="font-jua text-4xl">수업 코드를 넣어요</h1>
            <input
              className="field h-24 text-center font-jua text-6xl tracking-[0.3em] uppercase"
              value={code}
              onChange={(e) => setCode(normalizeCode(e.target.value))}
              autoCapitalize="characters"
              autoComplete="off"
              placeholder="ABC234"
              aria-label="수업 코드"
            />
            <button className="btn min-h-16 w-full text-2xl" disabled={busy}>
              다음 →
            </button>
          </form>
        )}

        {step === "number" && (
          <div className="flex w-full flex-col items-center gap-4">
            <h1 className="font-jua text-4xl">{className} · 내 번호를 눌러요</h1>
            <div className="grid w-full max-w-5xl grid-cols-[repeat(auto-fill,minmax(88px,1fr))] gap-3">
              {numbers.map((n) => (
                <button
                  key={n}
                  className="panel h-20 font-jua text-4xl text-blue transition hover:border-sky active:scale-95"
                  onClick={() => {
                    setNumber(n);
                    setPin("");
                    setMsg("");
                    setStep("pin");
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
            <button className="text-mute underline" onClick={() => setStep("code")}>
              ← 코드 다시 넣기
            </button>
          </div>
        )}

        {step === "pin" && (
          <div className="flex w-full flex-wrap items-center justify-center gap-10">
            <div className="flex flex-col items-center gap-5">
              <h1 className="font-jua text-4xl">{number}번 · PIN 4자리</h1>
              <div className="flex gap-4" aria-label={`${pin.length}자리 입력함`}>
                {[0, 1, 2, 3].map((i) => (
                  <span key={i} className={`h-8 w-8 rounded-full border-4 ${i < pin.length ? "border-blue bg-blue" : "border-line bg-white"}`} />
                ))}
              </div>
              <button className="text-mute underline" onClick={() => setStep("number")}>
                ← 번호 다시 고르기
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {KEYS.map((d, i) =>
                d ? (
                  <button key={i} className="panel h-20 w-24 font-jua text-4xl active:scale-95 active:bg-bg" onClick={() => press(d)} disabled={busy} aria-label={d === "⌫" ? "지우기" : d}>
                    {d}
                  </button>
                ) : (
                  <span key={i} />
                ),
              )}
            </div>
          </div>
        )}

        {msg && (
          <p className="rounded-2xl bg-stop-bg px-5 py-3 text-xl font-bold text-stop" role="alert">
            {msg}
          </p>
        )}
      </section>
    </main>
  );
}
