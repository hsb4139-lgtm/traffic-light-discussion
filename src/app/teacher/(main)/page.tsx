"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useMyClass } from "@/lib/useMyClass";
import { PHASES, type CardRow, type DebateRow } from "@/lib/types";

type DebateItem = DebateRow & { sd_cards: { count: number }[] };

export default function TeacherHome() {
  const router = useRouter();
  const { cls, loading, error, createClass } = useMyClass();
  const [name, setName] = useState("6학년 4반");
  const [debates, setDebates] = useState<DebateItem[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!cls) return;
    const { data } = await createClient()
      .from("sd_debates")
      .select("*, sd_cards(count)")
      .eq("class_id", cls.id)
      .order("created_at", { ascending: false });
    setDebates((data as DebateItem[]) ?? []);
  }, [cls]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 학급이 정해지면 토론 목록 불러오기
    load();
  }, [load]);

  async function createDebate() {
    if (!cls) return;
    setBusy(true);
    const { data, error } = await createClient()
      .from("sd_debates")
      .insert({ class_id: cls.id, title: "기업의 자유와 사회적 책임" })
      .select("id")
      .single();
    setBusy(false);
    if (error) return alert(error.message);
    router.push(`/teacher/debates/${data.id}/edit`);
  }

  async function copyDebate(d: DebateItem) {
    setBusy(true);
    const db = createClient();
    const { data: copy, error } = await db
      .from("sd_debates")
      .insert({ class_id: d.class_id, title: `${d.title} (복사)`, show_names: d.show_names })
      .select("id")
      .single();
    if (!error && copy) {
      const { data: cards } = await db.from("sd_cards").select("*").eq("debate_id", d.id).order("position");
      const rows = ((cards as CardRow[]) ?? []).map((c) => ({
        debate_id: copy.id,
        label: c.label,
        title: c.title,
        body: c.body,
        position: c.position,
      }));
      if (rows.length) await db.from("sd_cards").insert(rows);
    }
    setBusy(false);
    load();
  }

  async function removeDebate(d: DebateItem) {
    if (!confirm(`‘${d.title}’ 토론을 지울까요? 학생 의견과 모둠 투표도 모두 지워져요.`)) return;
    await createClient().from("sd_debates").delete().eq("id", d.id);
    load();
  }

  if (loading) return <p className="p-8 text-mute">불러오는 중…</p>;

  if (!cls) {
    return (
      <div className="grid h-full place-items-center p-6">
        <form
          className="panel flex w-full max-w-lg flex-col gap-3 p-8"
          onSubmit={(e) => {
            e.preventDefault();
            createClass(name.trim());
          }}
        >
          <h1 className="font-jua text-3xl text-blue">먼저 학급을 만들어요</h1>
          <input className="field" value={name} onChange={(e) => setName(e.target.value)} required />
          {error && <p className="text-stop">{error}</p>}
          <button className="btn text-lg">학급 만들기</button>
        </form>
      </div>
    );
  }

  return (
    <div className="grid h-full grid-cols-[minmax(260px,1fr)_3fr] gap-4 p-4">
      <aside className="panel flex flex-col gap-2 p-6">
        <p className="text-mute">{cls.name} · 수업 코드</p>
        <p className="font-jua text-6xl tracking-widest text-blue">{cls.join_code}</p>
        <Link href="/teacher/students" className="btn-ghost mt-4">
          학생 명단·PIN 관리 →
        </Link>
      </aside>

      <section className="panel flex min-h-0 flex-col p-5">
        <div className="mb-4 flex items-center">
          <h1 className="font-jua text-3xl text-blue">내 토론</h1>
          <div className="flex-1" />
          <button className="btn" onClick={createDebate} disabled={busy}>
            ＋ 새 토론
          </button>
        </div>
        <div className="grid min-h-0 flex-1 auto-rows-min grid-cols-[repeat(auto-fill,minmax(340px,1fr))] gap-3 overflow-auto">
          {debates.map((d) => {
            const live = d.phase !== "draft" && d.phase !== "closed";
            return (
              <article key={d.id} className={`flex flex-col gap-3 rounded-2xl border-2 p-4 ${live ? "border-go bg-go-bg" : "border-line bg-white"}`}>
                <div className="flex items-start gap-2">
                  <h2 className="flex-1 font-jua text-2xl leading-tight">{d.title}</h2>
                  <span className={`rounded-full px-3 py-1 text-sm font-bold ${live ? "bg-go text-white" : "bg-bg text-mute"}`}>
                    {live && "● "}
                    {PHASES.find((p) => p.key === d.phase)?.label}
                  </span>
                </div>
                <p className="text-sm text-mute">
                  카드 {d.sd_cards[0]?.count ?? 0}장 · {d.show_names ? "이름 공개" : "익명"} · {new Date(d.created_at).toLocaleDateString("ko-KR")}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/teacher/debates/${d.id}`} className="btn btn-sm">
                    ▶ 수업 진행판
                  </Link>
                  <Link href={`/teacher/debates/${d.id}/edit`} className="btn-ghost btn-sm">
                    편집
                  </Link>
                  <button className="btn-ghost btn-sm" onClick={() => copyDebate(d)} disabled={busy}>
                    복사
                  </button>
                  <button className="btn-ghost btn-sm text-stop" onClick={() => removeDebate(d)}>
                    지우기
                  </button>
                </div>
              </article>
            );
          })}
          {!debates.length && <p className="p-8 text-mute">‘＋ 새 토론’을 눌러 첫 토론을 만들어요.</p>}
        </div>
      </section>
    </div>
  );
}
