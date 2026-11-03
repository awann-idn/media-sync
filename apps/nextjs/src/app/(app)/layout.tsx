import Link from "next/link";
import { LogOut } from "lucide-react";

import { prisma } from "@mediasync/db";

import { DesktopNav, MobileNav } from "~/components/nav";
import { UserSwitcher } from "~/components/user-switcher";
import { formatDate } from "~/lib/format";
import { initials } from "~/lib/utils";

import { requireUser } from "~/server/auth";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const [project, users] = await Promise.all([
    prisma.project.findFirst(),
    prisma.user.findMany({
      include: { role: true },
      orderBy: [{ accessLevel: "asc" }, { name: "asc" }],
    }),
  ]);

  return (
    <div className="min-h-screen bg-cream">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-forest focus:px-4 focus:py-2 focus:text-sm focus:text-cream-card"
      >
        Lewati ke konten
      </a>

      <aside data-app-sidebar className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col bg-forest px-4 py-5 text-cream-card md:flex">
        <Link href="/dashboard" className="flex items-center gap-3 px-1">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-cream-card text-sm font-bold text-forest">
            MS
          </span>
          <span>
            <span className="block font-heading text-base font-bold">MediaSync</span>
            <span className="block text-[11px] text-cream-card/60">
              Ruang kerja tim
            </span>
          </span>
        </Link>

        <div className="mt-5 rounded-lg border border-white/10 bg-white/5 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-sage">
            Proyek aktif
          </p>
          <p className="mt-1 text-sm font-semibold leading-5 text-cream-card">
            {project?.name ?? "Proyek multimedia"}
          </p>
          {project ? (
            <p className="mt-1 text-[11px] text-cream-card/65">
              Target selesai {formatDate(project.officialEnd)}
            </p>
          ) : null}
        </div>

        <DesktopNav />

        <div className="mt-auto pt-4">
          <div className="flex items-center gap-2.5 rounded-lg border border-white/10 bg-white/5 p-2.5">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
              style={{ backgroundColor: user.avatarColor }}
            >
              {initials(user.name)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{user.name}</p>
              <p className="truncate text-[11px] text-cream-card/65">
                {user.accessLevel === "OBSERVER"
                  ? "Observer · hanya baca"
                  : user.role.name}
              </p>
            </div>
          </div>
        </div>
      </aside>

      <div className="md:pl-60">
        <header data-app-topbar className="sticky top-0 z-20 border-b border-cream-line bg-cream/95 backdrop-blur">
          <div className="mx-auto flex min-h-16 w-full max-w-[1280px] items-center justify-between gap-3 px-4 sm:px-6">
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-forest text-xs font-bold text-cream-card md:hidden"
              >
                MS
              </Link>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">
                  {project?.name ?? "MediaSync"}
                </p>
                <p className="truncate text-[11px] text-ink-muted">
                  {user.accessLevel === "OBSERVER"
                    ? "Mode observer"
                    : `${user.role.name} · ${user.name}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <UserSwitcher current={user} users={users} />
              <form action="/api/logout" method="post">
                <button
                  type="submit"
                  className="btn-ghost min-h-9 px-2.5 py-1.5 text-xs"
                  title="Keluar"
                >
                  <LogOut className="h-4 w-4" aria-hidden />
                  <span className="hidden sm:inline">Keluar</span>
                </button>
              </form>
            </div>
          </div>
        </header>

        <main
          id="main"
          className="mx-auto w-full max-w-[1280px] px-4 pb-24 pt-6 sm:px-6 md:pb-10"
        >
          {children}
        </main>
      </div>

      <MobileNav />
    </div>
  );
}
