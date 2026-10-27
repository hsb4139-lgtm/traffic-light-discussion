"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "./Logo";

const LINKS = [
  { href: "/teacher", label: "토론" },
  { href: "/teacher/students", label: "학생·PIN" },
];

export function TeacherBar() {
  const path = usePathname();
  const router = useRouter();

  async function logout() {
    await createClient().auth.signOut();
    router.replace("/teacher/login");
    router.refresh();
  }

  return (
    <header className="no-print flex items-center gap-3 border-b-2 border-line bg-white px-4 py-2">
      <Link href="/teacher"><Logo /></Link>
      <nav className="ml-4 flex gap-1">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`rounded-xl px-4 py-2 font-bold ${path === l.href ? "bg-blue text-white" : "text-mute hover:bg-bg"}`}
          >
            {l.label}
          </Link>
        ))}
      </nav>
      <div className="flex-1" />
      <button className="btn-ghost btn-sm" onClick={logout}>로그아웃</button>
    </header>
  );
}
