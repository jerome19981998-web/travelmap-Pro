"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types/database";
import type { User } from "@supabase/supabase-js";
import { Map, BarChart2, Heart, Share2, Settings, LogOut, Trophy, ChevronRight, Users } from "lucide-react";
import Image from "next/image";
import { clsx } from "clsx";
import { useLocale } from "@/hooks/useLocale";

export default function Sidebar({ profile, user }: { profile: Profile | null; user: User }) {
  const pathname = usePathname();
  const { t } = useLocale();

  const nav = [
    { href: "/dashboard", icon: Map, label: t.map, exact: true },
    { href: "/dashboard/stats", icon: BarChart2, label: t.stats },
    { href: "/dashboard/wishlist", icon: Heart, label: t.wishlist },
    { href: "/dashboard/badges", icon: Trophy, label: t.badges },
    { href: "/dashboard/friends", icon: Users, label: "Amis" },
    { href: "/dashboard/groups", icon: Users, label: "Groupes" },
    { href: "/dashboard/share", icon: Share2, label: t.share },
    { href: "/dashboard/settings", icon: Settings, label: t.settings },
  ];

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <aside className="fixed left-0 top-0 bottom-0 z-40 flex flex-col glass-elevated border-r border-[var(--surface-border)] w-16 lg:w-64 transition-all duration-300">
      <div className="flex items-center gap-3 px-4 py-5 border-b border-[var(--surface-border)]">
        <div className="w-8 h-8 flex-shrink-0 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-sm shadow-lg">🗺️</div>
        <span className="hidden lg:block font-bold text-sm text-[var(--text-primary)] tracking-tight">TravelMap Pro</span>
      </div>

      <nav className="flex-1 py-4 px-2 overflow-y-auto">
        <ul className="space-y-1">
          {nav.map(({ href, icon: Icon, label, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <li key={href}>
                <Link href={href} className={clsx(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                  active
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                    : "text-[var(--text-secondary)] hover:bg-white/5 hover:text-[var(--text-primary)]"
                )}>
                  <Icon className={clsx("w-4 h-4 flex-shrink-0", active ? "text-emerald-400" : "")} />
                  <span className="hidden lg:block">{label}</span>
                  {active && <ChevronRight className="hidden lg:block w-3 h-3 ml-auto text-emerald-400/50" />}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-[var(--surface-border)] p-3">
        <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/5 transition-colors">
          <div className="w-7 h-7 flex-shrink-0 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center overflow-hidden">
            {profile?.avatar_url ? (
              <Image src={profile.avatar_url} alt="" width={28} height={28} className="object-cover" />
            ) : (
              <span className="text-xs text-white font-bold">
                {(profile?.full_name || user.email || "U")[0].toUpperCase()}
              </span>
            )}
          </div>
          <div className="hidden lg:flex flex-col flex-1 min-w-0">
            <span className="text-xs font-medium text-[var(--text-primary)] truncate">
              {profile?.full_name || "Traveler"}
            </span>
            <span className="text-xs text-[var(--text-muted)] truncate">{user.email}</span>
          </div>
          <button onClick={handleSignOut}
            className="hidden lg:block text-[var(--text-muted)] hover:text-red-400 transition-colors p-1"
            title={t.signOut}>
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
