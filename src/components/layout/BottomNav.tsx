"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Map, BarChart2, Heart, Users, Settings } from "lucide-react";
import { clsx } from "clsx";
import { useLocale } from "@/hooks/useLocale";

export default function BottomNav() {
  const pathname = usePathname();
  const { t } = useLocale();

  const nav = [
    { href: "/dashboard", icon: Map, label: t.map, exact: true },
    { href: "/dashboard/stats", icon: BarChart2, label: t.stats },
    { href: "/dashboard/friends", icon: Users, label: "Amis" },
    { href: "/dashboard/wishlist", icon: Heart, label: t.wishlist },
    { href: "/dashboard/settings", icon: Settings, label: t.settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden glass-elevated border-t border-[var(--surface-border)]"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 8px)" }}>
      <div className="flex items-center justify-around px-1 py-1">
        {nav.map(({ href, icon: Icon, label, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link key={href} href={href}
              className={clsx(
                "flex flex-col items-center gap-0.5 px-2 py-2 rounded-xl transition-all duration-150 min-w-[52px]",
                active ? "text-emerald-400" : "text-[var(--text-muted)]"
              )}>
              <div className={clsx("p-1.5 rounded-xl transition-all", active ? "bg-emerald-500/15" : "")}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-medium leading-none">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
