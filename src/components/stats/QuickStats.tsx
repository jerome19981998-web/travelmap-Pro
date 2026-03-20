"use client";

import type { UserStats } from "@/types/database";

const TOTAL_COUNTRIES = 195;
const TOTAL_CONTINENTS = 7;

export default function QuickStats({ stats }: { stats: UserStats | null }) {
  const countries = stats?.countries_visited || 0;
  const continents = stats?.continents_visited || 0;
  const cities = stats?.cities_visited || 0;
  const total = stats?.total_visits || 0;

  const worldPct = Math.round((countries / TOTAL_COUNTRIES) * 100);
  const contPct = Math.round((continents / TOTAL_CONTINENTS) * 100);

  return (
    <div className="flex items-center gap-4 px-6 py-3 glass-elevated border-b border-[var(--surface-border)] overflow-x-auto">
      <StatItem label="Countries" value={countries} total={TOTAL_COUNTRIES} pct={worldPct} color="emerald" />
      <div className="w-px h-6 bg-[var(--surface-border)] flex-shrink-0" />
      <StatItem label="Continents" value={continents} total={TOTAL_CONTINENTS} pct={contPct} color="sky" />
      <div className="w-px h-6 bg-[var(--surface-border)] flex-shrink-0" />
      <StatItem label="Cities" value={cities} color="violet" />
      <div className="w-px h-6 bg-[var(--surface-border)] flex-shrink-0" />
      <StatItem label="Total visits" value={total} color="amber" />

      {/* World progress */}
      <div className="ml-auto flex items-center gap-3 flex-shrink-0">
        <div className="text-xs text-[var(--text-muted)]">World explored</div>
        <div className="flex items-center gap-2">
          <div className="w-28 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-1000"
              style={{ width: `${worldPct}%` }}
            />
          </div>
          <span className="text-xs font-bold text-emerald-400">{worldPct}%</span>
        </div>
      </div>
    </div>
  );
}

function StatItem({
  label, value, total, pct, color,
}: { label: string; value: number; total?: number; pct?: number; color: string }) {
  const colors: Record<string, string> = {
    emerald: "text-emerald-400",
    sky: "text-sky-400",
    violet: "text-violet-400",
    amber: "text-amber-400",
  };

  return (
    <div className="flex items-center gap-2 flex-shrink-0">
      <div className={`text-xl font-bold ${colors[color]}`}>{value}</div>
      <div>
        <div className="text-xs text-[var(--text-muted)] leading-tight">{label}</div>
        {total && <div className="text-[10px] text-[var(--text-muted)] opacity-60">of {total}</div>}
      </div>
    </div>
  );
}
