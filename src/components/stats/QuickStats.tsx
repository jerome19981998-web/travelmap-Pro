"use client";

import type { UserStats } from "@/types/database";
import { useLocale } from "@/hooks/useLocale";

const TOTAL_COUNTRIES = 195;
const TOTAL_CONTINENTS = 7;

export default function QuickStats({ stats }: { stats: UserStats | null }) {
  const { t } = useLocale();
  const countries = stats?.countries_visited || 0;
  const continents = stats?.continents_visited || 0;
  const cities = stats?.cities_visited || 0;
  const total = stats?.total_visits || 0;
  const worldPct = Math.round((countries / TOTAL_COUNTRIES) * 100);

  const items = [
    { label: t.countries, value: countries, sub: `/ ${TOTAL_COUNTRIES}`, color: "text-emerald-400" },
    { label: t.continents, value: continents, sub: `/ ${TOTAL_CONTINENTS}`, color: "text-sky-400" },
    { label: t.citiesPlaces, value: cities, sub: "", color: "text-violet-400" },
    { label: t.totalVisits, value: total, sub: "", color: "text-amber-400" },
  ];

  return (
    <div className="relative flex items-center glass-elevated border-b border-[var(--surface-border)] overflow-hidden">
      {/* Fade right */}
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[var(--surface-elevated)] to-transparent z-10 pointer-events-none" />

      {/* Scrollable stats */}
      <div
        className="flex items-center gap-1 px-4 overflow-x-auto py-2.5"
        style={{ WebkitOverflowScrolling: "touch", scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {items.map(({ label, value, sub, color }) => (
          <div key={label} className="flex items-center gap-2 flex-shrink-0 px-3 py-1">
            <span className={`text-xl font-bold ${color}`}>{value}</span>
            <div className="leading-tight">
              <div className="text-[11px] font-medium text-[var(--text-primary)] whitespace-nowrap">{label}</div>
              {sub && <div className="text-[10px] text-[var(--text-muted)]">{sub}</div>}
            </div>
          </div>
        ))}

        {/* Separator */}
        <div className="w-px h-6 bg-[var(--surface-border)] flex-shrink-0 mx-2" />

        {/* World progress */}
        <div className="flex items-center gap-2 flex-shrink-0 px-2">
          <span className="text-[11px] text-[var(--text-muted)] whitespace-nowrap">{t.worldExplored}</span>
          <div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden flex-shrink-0">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-1000"
              style={{ width: `${worldPct}%` }}
            />
          </div>
          <span className="text-xs font-bold text-emerald-400 flex-shrink-0">{worldPct}%</span>
        </div>

        {/* Spacer */}
        <div className="w-4 flex-shrink-0" />
      </div>
    </div>
  );
}
