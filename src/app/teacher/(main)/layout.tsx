import { TeacherBar } from "@/components/TeacherBar";

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col print:block print:h-auto">
      <TeacherBar />
      <div className="min-h-0 flex-1 overflow-auto print:overflow-visible">{children}</div>
    </div>
  );
}
