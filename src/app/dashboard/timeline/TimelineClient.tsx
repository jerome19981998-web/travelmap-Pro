"use client";

import type { Visit, VisitPhoto } from "@/types/database";
import { CalendarDays, CheckCircle2, Clock3, MapPin, Sparkles } from "lucide-react";

type VisitWithPhotos = Visit & { visit_photos?: VisitPhoto[] };

interface Props {
  visits: VisitWithPhotos[];
}

function getVisitDate(visit: Visit): Date {
  return new Date(visit.visited_at || visit.created_at);
}

function getYear(visit: Visit): string {
  const date = getVisitDate(visit);
  return Number.isFinite(date.getTime()) ? String(date.getFullYear()) : "Sans date";
}

export default function TimelineClient({ visits }: Props) {
  const quickMemories = visits.filter((visit) => visit.is_quick_memory);
  const byYear = visits.reduce<Record<string, VisitWithPhotos[]>>((acc, visit) => {
    const year = getYear(visit);
    acc[year] = acc[year] || [];
    acc[year].push(visit);
    return acc;
  }, {});

  const byCountry = visits.reduce<Record<string, Set<string>>>((acc, visit) => {
    const country = visit.country_name || "Pays inconnu";
    acc[country] = acc[country] || new Set();
    acc[country].add(visit.place_name);
    return acc;
  }, {});

  const years = Object.keys(byYear).sort((a, b) => Number(b) - Number(a));

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-6xl">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-emerald-400" />
            Mes voyages
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Timeline par année, pays et souvenirs à compléter.
          </p>
        </div>
        <div className="flex gap-2 text-xs text-[var(--text-secondary)]">
          <span className="rounded-lg border border-[var(--surface-border)] px-3 py-1.5">{visits.length} visites</span>
          <span className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-amber-300">{quickMemories.length} rapides</span>
        </div>
      </div>

      {visits.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center">
          <Sparkles className="mx-auto mb-4 h-10 w-10 text-[var(--text-muted)]" />
          <h2 className="font-semibold text-[var(--text-primary)]">Aucun voyage enregistré</h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">Ajoutez votre premier lieu depuis la carte pour construire votre histoire.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
          <div className="space-y-6">
            {years.map((year) => (
              <section key={year} className="glass rounded-2xl p-4 sm:p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-bold text-[var(--text-primary)]">{year}</h2>
                  <span className="text-xs text-[var(--text-muted)]">{byYear[year].length} étapes</span>
                </div>
                <div className="space-y-3">
                  {byYear[year].map((visit) => (
                    <div key={visit.id} className="flex gap-3 rounded-xl border border-[var(--surface-border)] bg-white/[0.03] p-3">
                      <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-300">
                        {visit.is_quick_memory ? <Clock3 className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-[var(--text-primary)]">{visit.place_name}</h3>
                          {visit.is_quick_memory && (
                            <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300">A compléter</span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                          {[visit.country_name, visit.place_type].filter(Boolean).join(" · ")}
                        </p>
                        {visit.notes && <p className="mt-2 line-clamp-2 text-sm text-[var(--text-secondary)]">{visit.notes}</p>}
                      </div>
                      <div className="hidden text-right text-xs text-[var(--text-muted)] sm:block">
                        {getVisitDate(visit).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <aside className="space-y-6">
            <section className="glass rounded-2xl p-5">
              <h2 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">Pays les plus explorés</h2>
              <div className="space-y-3">
                {Object.entries(byCountry)
                  .sort(([, a], [, b]) => b.size - a.size)
                  .slice(0, 8)
                  .map(([country, cities]) => (
                    <div key={country} className="flex items-center justify-between gap-3">
                      <span className="truncate text-sm text-[var(--text-secondary)]">{country}</span>
                      <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-semibold text-emerald-300">{cities.size}</span>
                    </div>
                  ))}
              </div>
            </section>

            <section className="glass rounded-2xl p-5">
              <h2 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">Souvenirs rapides</h2>
              {quickMemories.length > 0 ? (
                <div className="space-y-2">
                  {quickMemories.slice(0, 8).map((visit) => (
                    <div key={visit.id} className="rounded-xl border border-amber-500/15 bg-amber-500/5 p-3">
                      <div className="text-sm font-medium text-[var(--text-primary)]">{visit.place_name}</div>
                      <div className="mt-0.5 text-xs text-amber-300">A compléter plus tard</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-xl border border-[var(--surface-border)] p-3 text-sm text-[var(--text-secondary)]">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  Aucun souvenir rapide en attente.
                </div>
              )}
            </section>
          </aside>
        </div>
      )}
    </div>
  );
}
