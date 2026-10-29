"use client";

import { useState } from "react";
import { COLORS, SIGNAL } from "@/lib/signal";
import { SIGNAL_STYLE } from "@/components/Signal";
import type { Color } from "@/lib/types";

const WORD: Record<Color, string> = { green: "초록불", yellow: "노란불", red: "빨간불" };

/** 내 의견 표현하기: 색을 고르면 태블릿 화면 전체가 그 신호등 불빛이 된다. 저장하지 않는다. */
export function SignalLight({ onClose }: { onClose: () => void }) {
  const [color, setColor] = useState<Color | null>(null);

  if (color) {
    return (
      <div className={`${SIGNAL_STYLE[color].solid} fixed inset-0 z-50 grid place-items-center`}>
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="font-black leading-none" style={{ fontSize: "38vh" }} aria-hidden>
            {SIGNAL[color].icon}
          </span>
          <span className="font-jua" style={{ fontSize: "10vh" }}>
            {WORD[color]}
          </span>
        </div>
        <div className="absolute right-4 top-4 flex gap-2">
          <button className="rounded-full bg-black/20 px-5 py-2 text-lg font-bold" onClick={() => setColor(null)}>
            다시 고르기
          </button>
          <button className="rounded-full bg-black/20 px-5 py-2 text-lg font-bold" onClick={onClose}>
            닫기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg p-4">
      <div className="flex items-center gap-3 pb-4">
        <p className="font-jua text-4xl">내 의견은 무슨 색인가요?</p>
        <div className="flex-1" />
        <button className="btn-ghost" onClick={onClose}>
          닫기
        </button>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-3 gap-4">
        {COLORS.map((c) => (
          <button
            key={c}
            className={`${SIGNAL_STYLE[c].solid} flex flex-col items-center justify-center gap-4 rounded-3xl p-4 shadow-lg active:scale-95`}
            onClick={() => setColor(c)}
          >
            <span className="text-9xl font-black leading-none">{SIGNAL[c].icon}</span>
            <span className="font-jua text-5xl">{WORD[c]}</span>
            <span className="text-xl font-bold">{SIGNAL[c].label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
