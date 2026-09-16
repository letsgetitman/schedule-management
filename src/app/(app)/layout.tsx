import Link from "next/link";
import { auth, signOut } from "@/lib/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-black/10 px-6 py-3">
        <nav className="flex gap-4 text-sm font-medium">
          <Link href="/calendar">일정</Link>
          <Link href="/restaurants">맛집 지도</Link>
          <Link href="/workout">헬스</Link>
          <Link href="/settings">설정</Link>
        </nav>
        <div className="flex items-center gap-3 text-sm text-black/60">
          <span>{session?.user?.name}</span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button type="submit" className="underline">
              로그아웃
            </button>
          </form>
        </div>
      </header>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
