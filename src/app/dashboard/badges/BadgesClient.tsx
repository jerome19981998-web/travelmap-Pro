"use client";

import type { BadgeDefinition, UserStats } from "@/types/database";
import { Trophy, Lock } from "lucide-react";
import { clsx } from "clsx";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface EarnedBadge {
  id: string;
  badge_id: string;
  earned_at: string;
  badge_definitions: BadgeDefinition;
}

interface Props {
  allBadges: BadgeDefinition[];
  earned: EarnedBadge[];
  stats: UserStats | null;
  userId: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  world: "🌍 World Explorer",
  continent: "🗺️ Continent Conqueror",
  country: "🏳️ Country Collector",
  city: "🏙️ City Explorer",
  special: "⭐ Special",
};

const TIER_COLORS = ["", "text-amber-400", "text-sky-400", "text-violet-400", "text-rose-400", "text-yellow-300"];
const TIER_BG = ["", "bg-amber-400/10 border-amber-400/20", "bg-sky-400/10 border-sky-400/20", "bg-violet-400/10 border-violet-400/20", "bg-rose-400/10 border-rose-400/20", "bg-yellow-300/10 border-yellow-300/20"];

export default function BadgesClient({ allBadges, earned, stats, userId }: Props) {
  const [checkedBadges, setCheckedBadges] = useState<string[]>([]);

  const earnedIds = new Set(earned.map(e => e.badge_id));
  const earnedDates: Record<string, string> = {};
  earned.forEach(e => { earnedDates[e.badge_id] = e.earned_at; });

  // Auto-check and grant badges based on stats
  useEffect(() => {
    if (!stats) return;
    const supabase = createClient();
    const TOTAL_COUNTRIES = 195;

    const toGrant = allBadges.filter(badge => {
      if (earnedIds.has(badge.id)) return false;
      const cond = badge.condition_value as Record<string, number | string>;

      if (badge.condition_type === "countries_percent") {
        const pct = (stats.countries_visited / TOTAL_COUNTRIES) * 100;
        return pct >= Number(cond.threshold);
      }
      if (badge.condition_type === "total_visits") {
        return stats.total_visits >= Number(cond.threshold);
      }
      return false;
    });

    if (toGrant.length > 0) {
      toGrant.forEach(badge => {
        supabase.from("user_badges").insert({ user_id: userId, badge_id: badge.id }).then(({ error }) => {
          if (!error) setCheckedBadges(prev => [...prev, badge.id]);
        });
      });
    }
  }, [stats, allBadges, earnedIds, userId]);

  const byCategory = allBadges.reduce((acc, b) => {
    if (!acc[b.category]) acc[b.category] = [];
    acc[b.category].push(b);
    return acc;
  }, {} as Record<string, BadgeDefinition[]>);

  const totalEarned = earnedIds.size + checkedBadges.length;

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Trophy className="w-6 h-6 text-amber-400" />
            Badges & Trophies
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            {totalEarned} of {allBadges.length} earned
          </p>
        </div>
        {/* Progress */}
        <div className="flex items-center gap-3">
          <div className="w-32 h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-orange-400 rounded-full transition-all"
              style={{ width: `${(totalEarned / allBadges.length) * 100}%` }}
            />
          </div>
          <span className="text-xs font-bold text-amber-400">{Math.round((totalEarned / allBadges.length) * 100)}%</span>
        </div>
      </div>

      {/* By category */}
      <div className="space-y-8">
        {Object.entries(byCategory).map(([category, badges]) => (
          <div key={category}>
            <h2 className="text-sm font-semibold text-[var(--text-secondary)] mb-3">{CATEGORY_LABELS[category] || category}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {badges.map((badge) => {
                const isEarned = earnedIds.has(badge.id) || checkedBadges.includes(badge.id);
                const earnedDate = earnedDates[badge.id];
                return (
                  <div
                    key={badge.id}
                    className={clsx(
                      "relative rounded-2xl p-4 border transition-all duration-200",
                      isEarned
                        ? clsx(TIER_BG[badge.tier || 1], "shadow-lg")
                        : "glass opacity-50 hover:opacity-70 border-[var(--surface-border)]"
                    )}
                  >
                    {!isEarned && (
                      <div className="absolute top-2 right-2">
                        <Lock className="w-3 h-3 text-[var(--text-muted)]" />
                      </div>
                    )}
                    {isEarned && checkedBadges.includes(badge.id) && (
                      <div className="absolute top-2 right-2 text-[10px] text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded-full">NEW!</div>
                    )}
                    <div className="text-3xl mb-2">{badge.icon}</div>
                    <div className={clsx("text-xs font-bold mb-1", isEarned ? TIER_COLORS[badge.tier || 1] : "text-[var(--text-muted)]")}>
                      {badge.name}
                    </div>
                    <div className="text-[11px] text-[var(--text-muted)] leading-tight">{badge.description}</div>
                    {isEarned && earnedDate && (
                      <div className="text-[10px] text-[var(--text-muted)] mt-2">
                        {new Date(earnedDate).toLocaleDateString("en", { month: "short", year: "numeric" })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
