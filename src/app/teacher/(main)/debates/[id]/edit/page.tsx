"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { CardRow, DebateRow } from "@/lib/types";

type Draft = { id?: string; title: string; body: string };

const LABELS = ["A", "B", "C", "D", "E", "F"];
const BODY_MAX = 500;

export default function EditDebate() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [debate, setDebate] = useState<DebateRow | null>(null);
  const [title, setTitle] = useState("");
  const [showNames, setShowNames] = useState(false);
  const [cards, setCards] = useState<Draft[]>([]);
  const [removed, setRemoved] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const db = createClient();
    Promise.all([
      db.from("sd_debates").select("*").eq("id", id).single(),
      db.from("sd_cards").select("*").eq("debate_id", id).order("position"),
    ]).then(([d, c]) => {
      const row = d.data as DebateRow | null;
      if (!row) return setMsg("토론을 찾을 수 없어요.");
      setDebate(row);
      setTitle(row.title);
      setShowNames(row.show_names);
      const list = ((c.data as CardRow[]) ?? []).map((x) => ({ id: x.id, title: x.title, body: x.body }));
      setCards(list.length ? list : [{ title: "", body: "" }, { title: "", body: "" }]);
    });
  }, [id]);

  const patch = (i: number, p: Partial<Draft>) => setCards((cs) => cs.map((c, j) => (j === i ? { ...c, ...p } : c)));

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= cards.length) return;
    setCards((cs) => {
      const next = [...cs];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  function remove(i: number) {
    const c = cards[i];
    if (c.id && !confirm("이 카드를 지울까요? 이 카드에 쓴 모둠 투표와 의견도 지워져요.")) return;
    if (c.id) setRemoved((r) => [...r, c.id!]);
    setCards((cs) => cs.filter((_, j) => j !== i));
  }

  async function save(goTo?: string) {
    const filled = cards.filter((c) => c.title.trim());
    if (!title.trim()) return setMsg("토론 제목을 써 주세요.");
    if (!filled.length) return setMsg("카드를 1장 이상 써 주세요. (제목이 빈 카드는 저장되지 않아요)");
    setBusy(true);
    setMsg("");
    const db = createClient();
    const errors: string[] = [];
    const r1 = await db.from("sd_debates").update({ title: title.trim(), show_names: showNames }).eq("id", id);
    if (r1.error) errors.push(r1.error.message);
    const emptyWithId = cards.filter((c) => !c.title.trim() && c.id).map((c) => c.id!);
    const toDelete = [...removed, ...emptyWithId];
    if (toDelete.length) {
      const r = await db.from("sd_cards").delete().in("id", toDelete);
      if (r.error) errors.push(r.error.message);
    }
    const saved: Draft[] = [];
    for (const [i, c] of filled.entries()) {
      const row = { debate_id: id, label: LABELS[i], title: c.title.trim(), body: c.body.trim().slice(0, BODY_MAX), position: i };
      if (c.id) {
        const r = await db.from("sd_cards").update(row).eq("id", c.id);
        if (r.error) errors.push(r.error.message);
        saved.push(c);
      } else {
        const r = await db.from("sd_cards").insert(row).select("id").single();
        if (r.error) errors.push(r.error.message);
        saved.push({ ...c, id: r.data?.id });
      }
    }
    setBusy(false);
    if (errors.length) return setMsg(`저장하지 못한 부분이 있어요: ${errors[0]}`);
    setRemoved([]);
    setCards(saved);
    if (goTo) router.push(goTo);
    else setMsg("저장했어요 ✓");
  }

  if (!debate) return <p className="p-8 text-mute">{msg || "불러오는 중…"}</p>;
  const live = debate.phase !== "draft" && debate.phase !== "closed";

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div className="panel flex flex-wrap items-center gap-3 p-4">
        <Link href="/teacher" className="text-mute">
          ← 목록
        </Link>
        <input
          className="field min-w-80 flex-1 font-jua text-2xl"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="토론 제목"
          aria-label="토론 제목"
        />
        <label className="flex cursor-pointer items-center gap-2 rounded-xl border-2 border-line px-3 py-2 font-bold">
          <input type="checkbox" className="h-5 w-5" checked={showNames} onChange={(e) => setShowNames(e.target.checked)} />
          전광판·학생 화면에 이름 보이기
        </label>
        <button className="btn-ghost" disabled={busy} onClick={() => save()}>
          저장
        </button>
        <button className="btn" disabled={busy} onClick={() => save(`/teacher/debates/${id}`)}>
          저장하고 진행판으로 →
        </button>
      </div>

      {live && (
        <p className="rounded-xl bg-wait-bg px-4 py-2 font-semibold text-wait-ink">
          ⚠️ 지금 수업 중인 토론이에요. 카드를 지우면 학생들이 쓴 내용도 함께 지워져요.
        </p>
      )}
      {msg && <p className="rounded-xl bg-bg px-4 py-2 font-semibold">{msg}</p>}

      <div className="grid min-h-0 flex-1 auto-cols-[minmax(300px,1fr)] grid-flow-col gap-3 overflow-x-auto">
        {cards.map((c, i) => (
          <div key={c.id ?? `new-${i}`} className="panel flex min-h-0 flex-col gap-2 p-4">
            <div className="flex items-center gap-2">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-coral font-jua text-2xl text-white">{LABELS[i]}</span>
              <div className="flex-1" />
              <button className="btn-ghost btn-sm" onClick={() => move(i, -1)} disabled={i === 0} aria-label="왼쪽으로">
                ←
              </button>
              <button className="btn-ghost btn-sm" onClick={() => move(i, 1)} disabled={i === cards.length - 1} aria-label="오른쪽으로">
                →
              </button>
              <button className="btn-ghost btn-sm text-stop" onClick={() => remove(i)}>
                지우기
              </button>
            </div>
            <input
              className="field font-jua text-xl"
              value={c.title}
              onChange={(e) => patch(i, { title: e.target.value.slice(0, 40) })}
              placeholder="카드 제목 (예: 인기 캐릭터 출시)"
            />
            <textarea
              className="field min-h-0 flex-1 resize-none py-2 text-lg leading-relaxed"
              value={c.body}
              onChange={(e) => patch(i, { body: e.target.value.slice(0, BODY_MAX) })}
              placeholder="사례 내용을 써요. 학생 화면에 크게 보여요."
            />
            <p className="text-right text-sm text-mute">
              {c.body.length}/{BODY_MAX}
            </p>
          </div>
        ))}
        {cards.length < LABELS.length && (
          <button
            className="grid place-items-center rounded-3xl border-2 border-dashed border-sky font-jua text-2xl text-blue hover:bg-white"
            onClick={() => setCards((cs) => [...cs, { title: "", body: "" }])}
          >
            ＋ 카드 {LABELS[cards.length]} 더하기
          </button>
        )}
      </div>
    </div>
  );
}
