"use client";

import { useState } from "react";
import type { UserStats, Visit, AnnualGoal, WishlistItem } from "@/types/database";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from "recharts";
import { Globe, Map, Building, TrendingUp, Target, Home, Heart, Layers } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { useLocale } from "@/hooks/useLocale";

const TOTAL_COUNTRIES = 195;
const TOTAL_CONTINENTS = 7;

interface Props {
  stats: UserStats | null;
  visits: Visit[];
  goals: AnnualGoal[];
  wishlist: WishlistItem[];
  globalWishlist: WishlistItem[];
  globalVisits: Visit[];
  userId: string;
}

const CONTINENT_COUNTS: Record<string, number> = {
  Europe: 44, Asia: 48, Americas: 35, Africa: 54, Oceania: 14, Antarctica: 2,
};

function normalizeText(value: string | null | undefined) {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export default function StatsClient({ stats, visits, goals, wishlist, globalWishlist, globalVisits, userId }: Props) {
  const { t } = useLocale();
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

  const citiesByCountry = (() => {
    const map: Record<string, Set<string>> = {};
    visits.forEach((visit) => {
      const country = visit.country_name || "Unknown";
      if (!["city", "neighborhood", "landmark"].includes(visit.place_type)) return;
      map[country] = map[country] || new Set();
      map[country].add(visit.place_name);
    });
    return Object.entries(map)
      .sort(([, a], [, b]) => b.size - a.size)
      .slice(0, 8)
      .map(([country, citySet]) => ({ country, count: citySet.size }));
  })();

  const residencePlaces = visits.filter((visit) => normalizeText(visit.notes).includes("j y vis"));

  const wishlistByContinent = (() => {
    const map: Record<string, number> = {};
    wishlist.forEach((item) => {
      const continent = item.continent || "Unknown";
      map[continent] = (map[continent] || 0) + 1;
    });
    return Object.entries(map).sort(([, a], [, b]) => b - a);
  })();

  const popularWishlist = (() => {
    const map: Record<string, { name: string; country: string | null; count: number }> = {};
    globalWishlist.forEach((item) => {
      const key = `${normalizeText(item.place_name)}-${item.country_code || normalizeText(item.country_name)}`;
      if (!key.trim()) return;
      map[key] = map[key] || { name: item.place_name, country: item.country_name, count: 0 };
      map[key].count += 1;
    });
    return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 6);
  })();

  const topRatedCountries = (() => {
    const map: Record<string, { country: string; total: number; count: number }> = {};
    globalVisits.forEach((visit) => {
      if (!visit.country_name || !visit.rating) return;
      map[visit.country_name] = map[visit.country_name] || { country: visit.country_name, total: 0, count: 0 };
      map[visit.country_name].total += visit.rating;
      map[visit.country_name].count += 1;
    });
    return Object.values(map)
      .filter((item) => item.count >= 1)
      .map((item) => ({ ...item, average: item.total / item.count }))
      .sort((a, b) => b.average - a.average || b.count - a.count)
      .slice(0, 6);
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
    else { toast.success(t.goalSaved); setEditingGoal(false); }
  };

  const statCards = [
    { icon: Globe, label: t.countries, value: countries, sub: `${t.of} ${TOTAL_COUNTRIES} (${Math.round(countries/TOTAL_COUNTRIES*100)}%)`, color: "emerald" },
    { icon: Map, label: t.continents, value: continents, sub: `${t.of} ${TOTAL_CONTINENTS}`, color: "sky" },
    { icon: Building, label: t.citiesPlaces, value: cities, sub: t.logged, color: "violet" },
    { icon: TrendingUp, label: t.totalVisits, value: total, sub: t.allTime, color: "amber" },
  ];

  const colorMap: Record<string, string> = {
    emerald: "text-emerald-400 bg-emerald-400/10",
    sky: "text-sky-400 bg-sky-400/10",
    violet: "text-violet-400 bg-violet-400/10",
    amber: "text-amber-400 bg-amber-400/10",
  };

  return (
    <div className="min-h-dvh overflow-y-auto p-4 pb-28 sm:p-6 lg:pb-8 space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">{t.yourStats}</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          {stats?.first_visit ? `${t.travellingSince} ${new Date(stats.first_visit).getFullYear()}` : t.startLogging}
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
        {/* Smart insights */}
        <div className="glass rounded-2xl p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">{t.smartInsights}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
            <div className="rounded-xl border border-[var(--surface-border)] bg-white/[0.03] p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300 mb-3">
                <Layers className="w-4 h-4" />
                {t.citiesByCountry}
              </div>
              <div className="space-y-2">
                {citiesByCountry.length > 0 ? citiesByCountry.slice(0, 5).map((item) => (
                  <div key={item.country} className="flex justify-between gap-3 text-sm">
                    <span className="truncate text-[var(--text-secondary)]">{item.country}</span>
                    <span className="font-semibold text-emerald-300">{item.count}</span>
                  </div>
                )) : <p className="text-sm text-[var(--text-muted)]">{t.addCitiesForRanking}</p>}
              </div>
            </div>

            <div className="rounded-xl border border-[var(--surface-border)] bg-white/[0.03] p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-sky-300 mb-3">
                <Home className="w-4 h-4" />
                {t.residencePlaces}
              </div>
              <div className="space-y-2">
                {residencePlaces.length > 0 ? residencePlaces.slice(0, 5).map((visit) => (
                  <div key={visit.id} className="text-sm">
                    <div className="font-medium text-[var(--text-primary)]">{visit.place_name}</div>
                    <div className="text-xs text-[var(--text-muted)]">{visit.country_name}</div>
                  </div>
                )) : <p className="text-sm text-[var(--text-muted)]">{t.useHomeMode}</p>}
              </div>
            </div>

            <div className="rounded-xl border border-[var(--surface-border)] bg-white/[0.03] p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-violet-300 mb-3">
                <Heart className="w-4 h-4" />
                {t.wishlistByContinent}
              </div>
              <div className="space-y-2">
                {wishlistByContinent.length > 0 ? wishlistByContinent.map(([continent, count]) => (
                  <div key={continent} className="flex justify-between gap-3 text-sm">
                    <span className="truncate text-[var(--text-secondary)]">{continent}</span>
                    <span className="font-semibold text-violet-300">{count}</span>
                  </div>
                )) : <p className="text-sm text-[var(--text-muted)]">{t.emptyWishlistShort}</p>}
              </div>
            </div>

            <div className="rounded-xl border border-[var(--surface-border)] bg-white/[0.03] p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-rose-300 mb-3">
                <Heart className="w-4 h-4" />
                {t.popularWishlist}
              </div>
              <div className="space-y-2">
                {popularWishlist.length > 0 ? popularWishlist.map((item, index) => (
                  <div key={`${item.name}-${item.country}-${index}`} className="flex items-start justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <div className="truncate text-[var(--text-primary)]">{item.name}</div>
                      <div className="text-xs text-[var(--text-muted)]">{item.country || t.unknownCountry}</div>
                    </div>
                    <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-xs font-semibold text-rose-300">{item.count}</span>
                  </div>
                )) : <p className="text-sm text-[var(--text-muted)]">{t.notEnoughWishlistData}</p>}
              </div>
            </div>

            <div className="rounded-xl border border-[var(--surface-border)] bg-white/[0.03] p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-300 mb-3">
                <TrendingUp className="w-4 h-4" />
                {t.topRatedCountries}
              </div>
              <div className="space-y-2">
                {topRatedCountries.length > 0 ? topRatedCountries.map((item) => (
                  <div key={item.country} className="flex items-start justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <div className="truncate text-[var(--text-primary)]">{item.country}</div>
                      <div className="text-xs text-[var(--text-muted)]">{item.count} {item.count > 1 ? t.ratings : t.ratingLower}</div>
                    </div>
                    <span className="font-semibold text-amber-300">{item.average.toFixed(1)} ★</span>
                  </div>
                )) : <p className="text-sm text-[var(--text-muted)]">{t.notEnoughRatingData}</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Continent breakdown */}
        <div className="glass rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">{t.continentsExplored}</h2>
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
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">{t.visitsPerYear}</h2>
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
              {t.noDataYet}
            </div>
          )}
        </div>

        {/* Top countries */}
        {countryBreakdown.length > 0 && (
          <div className="glass rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">{t.mostVisitedCountries}</h2>
            <div className="space-y-2">
              {countryBreakdown.map(({ name, count }, i) => (
                <div key={name} className="flex items-center gap-3">
                  <span className="text-xs text-[var(--text-muted)] w-4">{i + 1}</span>
                  <div className="flex-1 flex items-center gap-2">
                    <span className="text-sm text-[var(--text-primary)]">{name}</span>
                  </div>
                  <span className="text-xs font-medium text-emerald-400">{count} {count === 1 ? t.visitLower : t.visitsLower}</span>
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
              {activeGoalYear} {t.annualGoal}
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
                {editingGoal ? t.cancel : thisYearGoal ? t.edit : t.setGoal}
              </button>
            </div>
          </div>

          {editingGoal ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[var(--text-muted)] mb-1">{t.targetCountries}</label>
                  <input type="number" value={goalCountries} onChange={e => setGoalCountries(e.target.value)} placeholder="10"
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-[var(--surface-border)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-amber-500/50" />
                </div>
                <div>
                  <label className="block text-xs text-[var(--text-muted)] mb-1">{t.targetCities}</label>
                  <input type="number" value={goalCities} onChange={e => setGoalCities(e.target.value)} placeholder="20"
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-[var(--surface-border)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-amber-500/50" />
                </div>
              </div>
              <button onClick={saveGoal} className="w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-white text-sm font-semibold transition-colors">
                {t.saveGoal}
              </button>
            </div>
          ) : thisYearGoal ? (
            <div className="space-y-4">
              {thisYearGoal.target_countries && (
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-[var(--text-secondary)]">{t.countriesVisited}</span>
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
                    <span className="text-[var(--text-secondary)]">{t.visitsThisYear}</span>
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
                  {t.goalAchieved}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <Target className="w-8 h-8 text-[var(--text-muted)]" />
              <p className="text-sm text-[var(--text-muted)]">{t.noGoalSet} {activeGoalYear}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
