import Link from "next/link";
import { Lights, Logo } from "@/components/Logo";

export default function Home() {
  return (
    <main className="grid h-full grid-cols-1 md:grid-cols-[1.1fr_1fr]">
      <section className="flex flex-col items-center justify-center gap-6 bg-white p-8 text-center">
        <Lights size={72} />
        <Logo size="text-6xl" />
        <p className="text-xl text-mute">초록 · 노랑 · 빨강으로 내 생각을 보여 줘요</p>
      </section>
      <section className="flex flex-col justify-center gap-5 p-8 md:p-14">
        <Link href="/s" className="btn min-h-28 text-3xl font-jua font-normal">
          🙋 학생으로 들어가기
        </Link>
        <Link href="/teacher" className="btn-ghost min-h-20 text-2xl font-jua font-normal">
          🧑‍🏫 선생님 로그인
        </Link>
      </section>
    </main>
  );
}
