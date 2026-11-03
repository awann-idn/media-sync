"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  CalendarDays,
  ClipboardCheck,
  LayoutDashboard,
  ListChecks,
  Scale,
  Settings,
} from "lucide-react";

import { cn } from "~/lib/utils";

const items = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tasks", label: "Tugas", icon: ListChecks },
  { href: "/decisions", label: "Keputusan", icon: Scale },
  { href: "/evaluations", label: "Evaluasi", icon: ClipboardCheck },
  { href: "/meetings", label: "Rapat", icon: CalendarDays },
  { href: "/conflicts", label: "Konflik", icon: AlertTriangle },
  { href: "/settings", label: "Pengaturan", icon: Settings },
];

const mobileItems = items.slice(0, 5);

export function DesktopNav() {
  const pathname = usePathname();
  return (
    <nav className="mt-6 flex flex-col gap-1" aria-label="Navigasi utama">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
              active
                ? "bg-cream-card text-forest"
                : "text-cream-card/80 hover:bg-white/10 hover:text-cream-card",
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-cream-line bg-paper pb-[env(safe-area-inset-bottom)] print:hidden md:hidden"
      aria-label="Navigasi seluler"
    >
      <div className="grid grid-cols-5">
        {mobileItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] font-medium",
                active ? "text-forest" : "text-ink-muted",
              )}
            >
              <Icon className="h-5 w-5" aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
