export function Logo({ size = "text-2xl" }: { size?: string }) {
  return (
    <span className={`font-jua ${size} whitespace-nowrap text-blue`}>
      🚦 신호등 <span className="text-coral">토론</span>
    </span>
  );
}

/** 초록·노랑·빨강 동그라미(아이콘 포함) */
export function Lights({ size = 40 }: { size?: number }) {
  const items = [
    ["bg-go", "✓"],
    ["bg-wait", "!"],
    ["bg-stop", "✕"],
  ] as const;
  return (
    <div className="flex gap-2" aria-hidden>
      {items.map(([bg, icon]) => (
        <span
          key={icon}
          className={`${bg} grid place-items-center rounded-full font-black text-white`}
          style={{ width: size, height: size, fontSize: size * 0.5 }}
        >
          {icon}
        </span>
      ))}
    </div>
  );
}
