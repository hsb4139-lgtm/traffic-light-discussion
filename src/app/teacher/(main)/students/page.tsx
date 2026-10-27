"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import bcrypt from "bcryptjs";
import { createClient } from "@/lib/supabase/client";
import { makePin } from "@/lib/codes";
import { useMyClass } from "@/lib/useMyClass";
import type { StudentRow } from "@/lib/types";
import { parseRoster } from "@/lib/roster";

type Issued = { number: number; name: string; pin: string };

const GROUPS = [1, 2, 3, 4, 5, 6];

const hashPin = (pin: string) => bcrypt.hash(pin, 8);

export default function StudentsPage() {
  const { cls, loading } = useMyClass();
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [text, setText] = useState("");
  const [issued, setIssued] = useState<Issued[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [mode, setMode] = useState<"one" | "paste">("one");
  // 한 명씩 추가
  const [oneNumber, setOneNumber] = useState("");
  const [oneName, setOneName] = useState("");
  const [oneGroup, setOneGroup] = useState<number | null>(null);
  const [oneLeader, setOneLeader] = useState(false);
  const [added, setAdded] = useState<Issued[]>([]);
  const nameRef = useRef<HTMLInputElement>(null);
  // 표에서 이름 고치기
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);

  const parsed = useMemo(() => parseRoster(text), [text]);
  const nextNumber = students.reduce((m, s) => Math.max(m, s.number), 0) + 1;

  const load = useCallback(async () => {
    if (!cls) return;
    const { data } = await createClient()
      .from("sd_students")
      .select("id, class_id, number, name, group_no, is_group_leader, failed_attempts, locked_until")
      .eq("class_id", cls.id)
      .order("number");
    setStudents((data as StudentRow[]) ?? []);
  }, [cls]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 학급이 정해지면 명단 불러오기
    load();
  }, [load]);

  async function register() {
    if (!cls || parsed.length === 0) return;
    setBusy(true);
    setMsg("");
    const supabase = createClient();
    const existing = new Map(students.map((s) => [s.number, s]));
    const fresh: Issued[] = [];
    const inserts = [];
    // 명단에 대표가 적힌 모둠은 기존 대표를 먼저 내린다
    for (const g of new Set(parsed.filter((p) => p.leader).map((p) => p.group_no!))) {
      await supabase.from("sd_students").update({ is_group_leader: false }).eq("class_id", cls.id).eq("group_no", g);
    }
    for (const p of parsed) {
      const old = existing.get(p.number);
      if (old) {
        const group_no = p.group_no ?? old.group_no;
        const patch: Partial<StudentRow> = { name: p.name, group_no };
        if (p.leader) patch.is_group_leader = true;
        else if (group_no !== old.group_no) patch.is_group_leader = false;
        await supabase.from("sd_students").update(patch).eq("id", old.id);
      } else {
        const pin = makePin();
        fresh.push({ number: p.number, name: p.name, pin });
        inserts.push({
          class_id: cls.id,
          number: p.number,
          name: p.name,
          group_no: p.group_no,
          is_group_leader: p.leader,
          pin_hash: await hashPin(pin),
        });
      }
    }
    if (inserts.length) {
      const { error } = await supabase.from("sd_students").insert(inserts);
      if (error) setMsg(`등록하지 못했어요: ${error.message}`);
    }
    setBusy(false);
    setText("");
    await load();
    if (fresh.length) setIssued(fresh);
    else setMsg("이름·모둠을 고쳤어요. (새 학생이 없어서 PIN은 그대로예요)");
  }

  async function addOne(e: React.FormEvent) {
    e.preventDefault();
    if (!cls) return;
    const number = oneNumber ? Number(oneNumber) : nextNumber;
    const name = oneName.trim().slice(0, 20);
    if (!Number.isInteger(number) || number < 1) return setMsg("번호를 확인해 주세요.");
    if (!name) return setMsg("이름을 써 주세요.");
    if (students.some((s) => s.number === number)) return setMsg(`${number}번은 이미 있어요. 표에서 이름을 눌러 고쳐 주세요.`);
    setBusy(true);
    setMsg("");
    const supabase = createClient();
    const leader = oneLeader && !!oneGroup;
    if (leader) await supabase.from("sd_students").update({ is_group_leader: false }).eq("class_id", cls.id).eq("group_no", oneGroup);
    const pin = makePin();
    const { error } = await supabase.from("sd_students").insert({
      class_id: cls.id,
      number,
      name,
      group_no: oneGroup,
      is_group_leader: leader,
      pin_hash: await hashPin(pin),
    });
    setBusy(false);
    if (error) return setMsg(`추가하지 못했어요: ${error.message}`);
    setAdded((a) => [...a, { number, name, pin }]);
    setOneNumber("");
    setOneName("");
    setOneLeader(false);
    await load();
    nameRef.current?.focus();
  }

  async function saveName() {
    if (!editing) return;
    const name = editing.name.trim().slice(0, 20);
    setEditing(null);
    if (!name) return;
    await createClient().from("sd_students").update({ name }).eq("id", editing.id);
    await load();
  }

  async function reissue(targets: StudentRow[]) {
    if (targets.length === 0) return;
    if (targets.length > 1 && !confirm(`${targets.length}명의 PIN을 모두 새로 만들까요? 이전 PIN은 쓸 수 없게 돼요.`)) return;
    setBusy(true);
    const supabase = createClient();
    const fresh: Issued[] = [];
    for (const s of targets) {
      const pin = makePin();
      await supabase
        .from("sd_students")
        .update({ pin_hash: await hashPin(pin), failed_attempts: 0, locked_until: null })
        .eq("id", s.id);
      fresh.push({ number: s.number, name: s.name, pin });
    }
    setBusy(false);
    await load();
    setIssued(fresh);
  }

  async function update(s: StudentRow, patch: Partial<StudentRow>) {
    const supabase = createClient();
    if (patch.is_group_leader && s.group_no) {
      // 한 모둠에 대표는 1명
      await supabase.from("sd_students").update({ is_group_leader: false }).eq("class_id", s.class_id).eq("group_no", s.group_no);
    }
    if (patch.group_no !== undefined && patch.group_no !== s.group_no) patch.is_group_leader = false;
    await supabase.from("sd_students").update(patch).eq("id", s.id);
    await load();
  }

  async function remove(s: StudentRow) {
    if (!confirm(`${s.number}번 ${s.name} 학생을 지울까요? 이 학생의 의견도 함께 지워져요.`)) return;
    await createClient().from("sd_students").delete().eq("id", s.id);
    await load();
  }

  if (loading) return <p className="p-8 text-mute">불러오는 중…</p>;
  if (!cls) return <p className="p-8">먼저 ‘토론’ 화면에서 학급을 만들어 주세요.</p>;

  if (issued) return <PinCards cls={cls} issued={issued} onClose={() => setIssued(null)} />;

  const locked = (s: StudentRow) => !!s.locked_until && new Date(s.locked_until) > new Date();

  return (
    <div className="grid h-full grid-cols-[minmax(320px,1fr)_2.2fr] gap-4 p-4">
      <aside className="panel flex min-h-0 flex-col gap-3 overflow-auto p-5">
        <div className="flex items-center gap-2">
          {(["one", "paste"] as const).map((m) => (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                setMsg("");
              }}
              className={`rounded-xl px-3 py-2 font-jua text-lg ${mode === m ? "bg-blue text-white" : "bg-bg text-mute"}`}
            >
              {m === "one" ? "한 명씩 추가" : "명단 붙여넣기"}
            </button>
          ))}
          <div className="flex-1" />
          <span className="text-sm text-mute">코드 <b className="font-jua text-lg text-blue">{cls.join_code}</b></span>
        </div>

        {mode === "one" ? (
          <form onSubmit={addOne} className="flex flex-col gap-3">
            <div className="grid grid-cols-[90px_1fr] gap-2">
              <label className="text-sm text-mute" htmlFor="one-number">번호</label>
              <label className="text-sm text-mute" htmlFor="one-name">이름</label>
              <input
                id="one-number"
                className="field text-center font-jua text-xl"
                inputMode="numeric"
                value={oneNumber}
                placeholder={String(nextNumber)}
                onChange={(e) => setOneNumber(e.target.value.replace(/\D/g, "").slice(0, 3))}
              />
              <input
                id="one-name"
                ref={nameRef}
                className="field text-xl"
                value={oneName}
                maxLength={20}
                placeholder="이름"
                autoComplete="off"
                onChange={(e) => setOneName(e.target.value)}
              />
            </div>
            <div>
              <p className="mb-1 text-sm text-mute">모둠</p>
              <div className="flex gap-1.5">
                {GROUPS.map((g) => (
                  <button
                    type="button"
                    key={g}
                    onClick={() => {
                      setOneGroup(oneGroup === g ? null : g);
                      if (oneGroup === g) setOneLeader(false);
                    }}
                    className={`h-11 flex-1 rounded-xl border-2 font-jua text-xl ${oneGroup === g ? "border-blue bg-blue text-white" : "border-line text-mute"}`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
            <label className={`flex items-center gap-2 font-bold ${oneGroup ? "" : "opacity-40"}`}>
              <input type="checkbox" className="h-5 w-5" disabled={!oneGroup} checked={oneLeader} onChange={(e) => setOneLeader(e.target.checked)} />
              모둠 대표
            </label>
            <button className="btn text-lg" disabled={busy || !oneName.trim()}>
              {busy ? "추가하는 중…" : `＋ ${oneNumber || nextNumber}번 추가 (Enter)`}
            </button>
            <p className="text-sm text-mute">추가하면 번호가 하나씩 올라가고 모둠은 그대로 남아요. 같은 모둠 친구를 이어서 넣기 편해요.</p>
            {msg && <p className="rounded-xl bg-wait-bg p-2 text-sm font-semibold text-wait-ink">{msg}</p>}
            {added.length > 0 && (
              <div className="rounded-2xl bg-bg p-3">
                <p className="font-bold">방금 추가한 학생 {added.length}명</p>
                <p className="my-1 text-sm text-mute">{added.map((a) => `${a.number} ${a.name}`).join(" · ")}</p>
                <button type="button" className="btn btn-sm w-full" onClick={() => { setIssued(added); setAdded([]); }}>
                  🖨️ 이 학생들 PIN 카드 보기·인쇄
                </button>
                <p className="mt-1 text-xs text-mute">이 화면을 나가기 전에 꼭 PIN 카드를 인쇄해 주세요.</p>
              </div>
            )}
          </form>
        ) : (
        <>
        <p className="text-sm text-mute">
          한 줄에 한 명: <code>번호 이름 모둠 [대표]</code> (모둠·대표는 빼도 돼요)
          <br />
          예) <code>1 김민준 2</code> · <code>2 이서연 2모둠 대표</code> · <code>3 박지호 1모둠원</code>
        </p>
        <textarea
          className="field min-h-0 flex-1 resize-none py-2 font-mono text-base"
          placeholder={"1 김민준 1\n2 이서연 1\n3 박지호 2"}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <p className="text-sm text-mute">{parsed.length}명 읽음 (대표 {parsed.filter((p) => p.leader).length}명) ·이미 있는 번호는 이름·모둠만 고쳐요</p>
        {msg && <p className="rounded-xl bg-wait-bg p-2 text-sm font-semibold text-wait-ink">{msg}</p>}
        <button className="btn" disabled={busy || parsed.length === 0} onClick={register}>
          {busy ? "만드는 중…" : "등록하고 새 학생 PIN 만들기"}
        </button>
        </>
        )}
      </aside>

      <section className="panel flex min-h-0 flex-col p-5">
        <div className="mb-3 flex items-center gap-3">
          <h2 className="font-jua text-2xl text-blue">우리 반 {students.length}명</h2>
          <GroupSummary students={students} />
          <div className="flex-1" />
          <button className="btn-ghost btn-sm" disabled={busy || !students.length} onClick={() => reissue(students)}>
            전체 PIN 새로 만들기
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full border-collapse text-left">
            <thead className="sticky top-0 bg-white text-sm text-mute">
              <tr className="border-b-2 border-line">
                <th className="p-2">번호</th>
                <th className="p-2">이름</th>
                <th className="p-2">모둠</th>
                <th className="p-2">대표</th>
                <th className="p-2">상태</th>
                <th className="p-2 text-right">관리</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id} className="border-b border-line">
                  <td className="p-2 font-jua text-xl">{s.number}</td>
                  <td className="p-2 font-semibold">
                    {editing?.id === s.id ? (
                      <input
                        autoFocus
                        className="field min-h-9 w-36 py-1 text-base"
                        value={editing.name}
                        maxLength={20}
                        onChange={(e) => setEditing({ id: s.id, name: e.target.value })}
                        onBlur={saveName}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveName();
                          if (e.key === "Escape") setEditing(null);
                        }}
                        aria-label={`${s.number}번 이름`}
                      />
                    ) : (
                      <button className="rounded-lg px-1 hover:bg-bg" title="눌러서 이름 고치기" onClick={() => setEditing({ id: s.id, name: s.name })}>
                        {s.name} <span className="text-xs text-mute">✎</span>
                      </button>
                    )}
                  </td>
                  <td className="p-2">
                    <div className="flex gap-1">
                      {GROUPS.map((g) => (
                        <button
                          key={g}
                          className={`h-9 w-9 rounded-lg border-2 font-bold ${s.group_no === g ? "border-blue bg-blue text-white" : "border-line text-mute"}`}
                          onClick={() => update(s, { group_no: s.group_no === g ? null : g })}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </td>
                  <td className="p-2">
                    <button
                      disabled={!s.group_no}
                      className={`rounded-lg px-3 py-1.5 text-sm font-bold ${s.is_group_leader ? "bg-coral text-white" : "border-2 border-line text-mute"} disabled:opacity-30`}
                      onClick={() => update(s, { is_group_leader: !s.is_group_leader })}
                    >
                      {s.is_group_leader ? "★ 대표" : "대표로"}
                    </button>
                  </td>
                  <td className="p-2">
                    {locked(s) ? (
                      <button className="rounded-lg bg-stop px-3 py-1.5 text-sm font-bold text-white" onClick={() => update(s, { failed_attempts: 0, locked_until: null })}>
                        🔒 잠금 풀기
                      </button>
                    ) : (
                      <span className="text-sm text-mute">{s.failed_attempts ? `PIN ${s.failed_attempts}번 틀림` : "—"}</span>
                    )}
                  </td>
                  <td className="p-2 text-right whitespace-nowrap">
                    <button className="btn-ghost btn-sm" disabled={busy} onClick={() => reissue([s])}>PIN 새로</button>{" "}
                    <button className="btn-ghost btn-sm text-stop" onClick={() => remove(s)}>지우기</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {students.length === 0 && <p className="p-8 text-center text-mute">왼쪽에서 학생을 한 명씩 추가하거나 명단을 붙여 넣어 주세요.</p>}
        </div>
      </section>
    </div>
  );
}

function GroupSummary({ students }: { students: StudentRow[] }) {
  return (
    <div className="flex gap-1 text-sm">
      {GROUPS.map((g) => {
        const members = students.filter((s) => s.group_no === g);
        if (!members.length) return null;
        const hasLeader = members.some((s) => s.is_group_leader);
        return (
          <span key={g} className={`rounded-full px-2 py-0.5 font-bold ${hasLeader ? "bg-go-bg text-go" : "bg-stop-bg text-stop"}`}>
            {g}모둠 {members.length}명{hasLeader ? "" : " · 대표 없음"}
          </span>
        );
      })}
    </div>
  );
}

function PinCards({ cls, issued, onClose }: { cls: { name: string; join_code: string }; issued: Issued[]; onClose: () => void }) {
  return (
    <div className="p-4">
      <div className="no-print mb-4 flex items-center gap-3 rounded-2xl bg-wait-bg p-4 text-wait-ink">
        <b>⚠️ 이 화면을 닫으면 PIN을 다시 볼 수 없어요.</b> 지금 인쇄해 주세요. (잃어버리면 ‘PIN 새로’로 다시 만들어요)
        <div className="flex-1" />
        <button className="btn" onClick={() => window.print()}>🖨️ 인쇄하기</button>
        <button className="btn-ghost" onClick={onClose}>다 했어요</button>
      </div>
      <div className="grid grid-cols-4 gap-3 print:grid-cols-4 print:gap-2">
        {issued.map((s) => (
          <div key={s.number} className="break-inside-avoid rounded-2xl border-2 border-dashed border-sky bg-white p-4">
            <p className="text-sm text-mute">🚦 신호등 토론 · {cls.name}</p>
            <p className="mt-1 font-jua text-2xl">{s.number}번 {s.name}</p>
            <div className="mt-2 grid grid-cols-2 gap-2 text-center">
              <div className="rounded-xl bg-bg p-2">
                <p className="text-xs text-mute">수업 코드</p>
                <p className="font-jua text-xl tracking-wider text-blue">{cls.join_code}</p>
              </div>
              <div className="rounded-xl bg-bg p-2">
                <p className="text-xs text-mute">내 PIN</p>
                <p className="font-jua text-xl tracking-[0.3em] text-coral">{s.pin}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
