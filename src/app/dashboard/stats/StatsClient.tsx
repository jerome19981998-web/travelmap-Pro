"use client";

import { useState } from "react";
import type { UserStats, Visit, AnnualGoal } from "@/types/database";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from "recharts";
import { Globe, Map, Building, TrendingUp, Calendar, Target, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";

const TOTAL_COUNTRIES = 195;
const TOTAL_CONTINENTS = 7;

interface Props {
  stats: UserStats | null;
  visits: Visit[];
  goals: AnnualGoal[];
  userId: string;
}

const CONTINENT_COUNTS: Record<string, number> = {
  Europe: 44, Asia: 48, Americas: 35, Africa: 54, Oceania: 14, Antarctica: 2,
};

export default function StatsClient({ stats, visits, goals, userId }: Props) {
  const [activeGoalYear, setActiveGoalYear] = useState(new Date().getFullYear());
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalCountries, setGoalCountries] = useState("");
  const [goalCities, setGoalCities] = useState("");

  const countries = stats?.countries_visited || 0;
  const continents = stats?.continents_visited || 0;
  const cities = stats?.cities_visited || 0;
  const total = stats?.total_visits || 0;

  // Continent breakdown
  const continentData = Object.entries(CONTINENT_COUNTS).map(([name, total]) => {
    const visited = visits.filter(v => v.continent === name).length;
    return { name: name.slice(0, 3), visited, total, pct: Math.round((visited / total) * 100) };
  });

  // Year timeline
  const yearData = (() => {
    const map: Record<number, number> = {};
    visits.forEach(v => {
      if (!v.visited_at) return;
      const yr = new Date(v.visited_at).getFullYear();
      map[yr] = (map[yr] || 0) + 1;
    });
    return Object.entries(map).sort(([a], [b]) => Number(a) - Number(b)).map(([year, count]) => ({
      year: year,
      visits: count,
    }));
  })();

  // Monthly heatmap current year
  const monthData = (() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const map: Record<number, number> = {};
    visits.forEach(v => {
      if (!v.visited_at) return;
      const d = new Date(v.visited_at);
      if (d.getFullYear() !== activeGoalYear) return;
      map[d.getMonth()] = (map[d.getMonth()] || 0) + 1;
    });
    return months.map((m, i) => ({ month: m, visits: map[i] || 0 }));
  })();

  // Top visited countries
  const countryBreakdown = (() => {
    const map: Record<string, number> = {};
    visits.forEach(v => {
      if (v.country_name) map[v.country_name] = (map[v.country_name] || 0) + 1;
    });
    return Object.entries(map).sort(([, a], [, b]) => b - a).slice(0, 8).map(([name, count]) => ({ name, count }));
  })();

  const thisYearGoal = goals.find(g => g.year === activeGoalYear);
  const thisYearVisits = visits.filter(v => v.visited_at && new Date(v.visited_at).getFullYear() === activeGoalYear);
  const thisYearCountries = new Set(thisYearVisits.map(v => v.country_code).filter(Boolean)).size;

  const saveGoal = async () => {
    const supabase = createClient();
    const data = {
      user_id: userId,
      year: activeGoalYear,
      target_countries: goalCountries ? parseInt(goalCountries) : null,
      target_cities: goalCities ? parseInt(goalCities) : null,
    };
    const { error } = thisYearGoal
      ? await supabase.from("annual_goals").update(data).eq("id", thisYearGoal.id)
      : await supabase.from("annual_goals").insert(data);
    if (error) toast.error(error.message);
    else { toast.success("Goal saved!"); setEditingGoal(false); }
  };

  const statCards = [
    { icon: Globe, label: "Countries", value: countries, sub: `of ${TOTAL_COUNTRIES} (${Math.round(countries/TOTAL_COUNTRIES*100)}%)`, color: "emerald" },
    { icon: Map, label: "Continents", value: continents, sub: `of ${TOTAL_CONTINENTS}`, color: "sky" },
    { icon: Building, label: "Cities & places", value: cities, sub: "logged", color: "violet" },
    { icon: TrendingUp, label: "Total visits", value: total, sub: "all time", color: "amber" },
  ];

  const colorMap: Record<string, string> = {
    emerald: "text-emerald-400 bg-emerald-400/10",
    sky: "text-sky-400 bg-sky-400/10",
    violet: "text-violet-400 bg-violet-400/10",
    amber: "text-amber-400 bg-amber-400/10",
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Your Travel Stats</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          {stats?.first_visit ? `Travelling since ${new Date(stats.first_visit).getFullYear()}` : "Start logging your adventures!"}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ icon: Icon, label, value, sub, color }) => (
          <div key={label} className="glass rounded-2xl p-5">
            <div className={`w-10 h-10 rounded-xl ${colorMap[color]} flex items-center justify-center mb-3`}>
              <Icon className="w-5 h-5" />
            </div>
            <div className={`text-3xl font-bold ${colorMap[color].split(" ")[0]} mb-0.5`}>{value}</div>
            <div className="text-xs font-medium text-[var(--text-primary)]">{label}</div>
            <div className="text-xs text-[var(--text-muted)] mt-0.5">{sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Continent breakdown */}
        <div className="glass rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Continents explored</h2>
          <div className="space-y-3">
            {continentData.map(({ name, visited, total, pct }) => (
              <div key={name}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[var(--text-secondary)]">{name}</span>
                  <span className="text-[var(--text-muted)]">{visited}/{total}</span>
                </div>
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-1000"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Visits by year */}
        <div className="glass rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Visits per year</h2>
          {yearData.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={yearData} barSize={20}>
                <XAxis dataKey="year" tick={{ fontSize: 11, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "var(--surface-elevated)", border: "1px solid var(--surface-border)", borderRadius: 12, fontSize: 12 }}
                  cursor={{ fill: "rgba(255,255,255,0.03)" }}
                />
                <Bar dataKey="visits" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-40 flex items-center justify-center text-sm text-[var(--text-muted)]">
              No data yet — log your first visit!
            </div>
          )}
        </div>

        {/* Top countries */}
        {countryBreakdown.length > 0 && (
          <div className="glass rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Most visited countries</h2>
            <div className="space-y-2">
              {countryBreakdown.map(({ name, count }, i) => (
                <div key={name} className="flex items-center gap-3">
                  <span className="text-xs text-[var(--text-muted)] w-4">{i + 1}</span>
                  <div className="flex-1 flex items-center gap-2">
                    <span className="text-sm text-[var(--text-primary)]">{name}</span>
                  </div>
                  <span className="text-xs font-medium text-emerald-400">{count} {count === 1 ? "visit" : "visits"}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Annual goal */}
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <Target className="w-4 h-4 text-amber-400" />
              {activeGoalYear} Goal
            </h2>
            <div className="flex items-center gap-2">
              <select
                value={activeGoalYear}
                onChange={(e) => setActiveGoalYear(Number(e.target.value))}
                className="text-xs bg-white/5 border border-[var(--surface-border)] rounded-lg px-2 py-1 text-[var(--text-secondary)]"
              >
                {[new Date().getFullYear(), new Date().getFullYear() + 1, new Date().getFullYear() - 1].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <button
                onClick={() => { setEditingGoal(!editingGoal); setGoalCountries(thisYearGoal?.target_countries?.toString() || ""); setGoalCities(thisYearGoal?.target_cities?.toString() || ""); }}
                className="text-xs px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors"
              >
                {editingGoal ? "Cancel" : thisYearGoal ? "Edit" : "Set goal"}
              </button>
            </div>
          </div>

          {editingGoal ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[var(--text-muted)] mb-1">Countries target</label>
                  <input type="number" value={goalCountries} onChange={e => setGoalCountries(e.target.value)} placeholder="10"
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-[var(--surface-border)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-amber-500/50" />
                </div>
                <div>
                  <label className="block text-xs text-[var(--text-muted)] mb-1">Cities target</label>
                  <input type="number" value={goalCities} onChange={e => setGoalCities(e.target.value)} placeholder="20"
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-[var(--surface-border)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-amber-500/50" />
                </div>
              </div>
              <button onClick={saveGoal} className="w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-white text-sm font-semibold transition-colors">
                Save goal
              </button>
            </div>
          ) : thisYearGoal ? (
            <div className="space-y-4">
              {thisYearGoal.target_countries && (
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-[var(--text-secondary)]">Countries visited</span>
                    <span className="text-amber-400 font-medium">{thisYearCountries}/{thisYearGoal.target_countries}</span>
                  </div>
                  <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-orange-400 rounded-full transition-all duration-1000"
                      style={{ width: `${Math.min(100, (thisYearCountries / thisYearGoal.target_countries) * 100)}%` }}
                    />
                  </div>
                </div>
              )}
              {thisYearGoal.target_cities && (
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-[var(--text-secondary)]">Visits this year</span>
                    <span className="text-amber-400 font-medium">{thisYearVisits.length}/{thisYearGoal.target_cities}</span>
                  </div>
                  <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-orange-400 rounded-full transition-all duration-1000"
                      style={{ width: `${Math.min(100, (thisYearVisits.length / thisYearGoal.target_cities) * 100)}%` }}
                    />
                  </div>
                </div>
              )}
              {thisYearCountries >= (thisYearGoal.target_countries || Infinity) && (
                <div className="text-center py-2 text-sm text-amber-300 bg-amber-500/10 rounded-xl border border-amber-500/20">
                  🎉 Goal achieved! Incredible!
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <Target className="w-8 h-8 text-[var(--text-muted)]" />
              <p className="text-sm text-[var(--text-muted)]">No goal set for {activeGoalYear}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
