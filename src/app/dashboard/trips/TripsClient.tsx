"use client";

import type { Visit } from "@/types/database";
import { AlertTriangle, CalendarDays, CheckCircle2, Flag, MapPinned, Route, Sparkles } from "lucide-react";

type Trip = {
  id: string;
  title: string;
  description: string | null;
  started_at: string | null;
  ended_at: string | null;
  is_private?: boolean | null;
};

type TripStop = {
  id: string;
  trip_id: string;
  place_name: string;
  country_code: string | null;
  country_name: string | null;
  stop_order: number;
  arrived_at: string | null;
  departed_at: string | null;
};

function formatDate(date: string | null): string {
  if (!date) return "Date libre";
  const parsed = new Date(date);
  if (!Number.isFinite(parsed.getTime())) return "Date libre";
  return parsed.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

export default function TripsClient({
  trips,
  stops,
  legacyVisits,
  setupError,
}: {
  trips: Trip[];
  stops: TripStop[];
  legacyVisits: Visit[];
  setupError: string | null;
}) {
  const stopsByTrip = stops.reduce<Record<string, TripStop[]>>((acc, stop) => {
    acc[stop.trip_id] = acc[stop.trip_id] || [];
    acc[stop.trip_id].push(stop);
    return acc;
  }, {});

  const countries = new Set(stops.map((stop) => stop.country_code || stop.country_name).filter(Boolean));

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-[var(--text-primary)]">
            <Route className="h-6 w-6 text-emerald-400" />
            Voyages multi-etapes
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Regroupe plusieurs villes dans un meme voyage, avec dates, ordre et pays traverses.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-xl border border-[var(--surface-border)] bg-white/[0.03] px-3 py-2">
            <div className="font-bold text-[var(--text-primary)]">{trips.length}</div>
            <div className="text-[var(--text-muted)]">voyages</div>
          </div>
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2">
            <div className="font-bold text-emerald-300">{stops.length}</div>
            <div className="text-emerald-200/80">etapes</div>
          </div>
          <div className="rounded-xl border border-sky-500/20 bg-sky-500/10 px-3 py-2">
            <div className="font-bold text-sky-300">{countries.size}</div>
            <div className="text-sky-200/80">pays</div>
          </div>
        </div>
      </div>

      {setupError && (
        <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-300" />
            <div>
              <h2 className="font-semibold text-amber-200">Migration Supabase a appliquer</h2>
              <p className="mt-1 text-sm text-amber-100/80">
                Les voyages simples continuent de s'enregistrer. Pour activer les vrais voyages relies,
                applique la migration <span className="font-mono">003_trips.sql</span> dans Supabase.
              </p>
            </div>
          </div>
        </div>
      )}

      {trips.length === 0 ? (
        <div className="rounded-2xl border border-[var(--surface-border)] bg-white/[0.03] p-10 text-center">
          <Sparkles className="mx-auto mb-4 h-10 w-10 text-[var(--text-muted)]" />
          <h2 className="font-semibold text-[var(--text-primary)]">Aucun voyage structure pour le moment</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-[var(--text-secondary)]">
            Depuis la carte, choisis le mode Voyage puis ajoute plusieurs etapes. Elles apparaitront ici avec leur ordre.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {trips.map((trip) => {
            const tripStops = (stopsByTrip[trip.id] || []).sort((a, b) => a.stop_order - b.stop_order);
            return (
              <article key={trip.id} className="rounded-2xl border border-[var(--surface-border)] bg-white/[0.03] p-4 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-[var(--text-primary)]">{trip.title}</h2>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
                      <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{formatDate(trip.started_at)} - {formatDate(trip.ended_at)}</span>
                      <span className="inline-flex items-center gap-1"><MapPinned className="h-3.5 w-3.5" />{tripStops.length} etapes</span>
                    </p>
                    {trip.description && <p className="mt-3 text-sm text-[var(--text-secondary)]">{trip.description}</p>}
                  </div>
                  {trip.is_private ? (
                    <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-[var(--text-muted)]">Prive</span>
                  ) : (
                    <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">Visible sur partage</span>
                  )}
                </div>

                <div className="mt-5 grid grid-cols-1 gap-2 md:grid-cols-2">
                  {tripStops.map((stop, index) => (
                    <div key={stop.id} className="flex items-center gap-3 rounded-xl border border-[var(--surface-border)] bg-black/10 p-3">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-sm font-bold text-emerald-300">
                        {index + 1}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-[var(--text-primary)]">{stop.place_name}</div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
                          <span className="inline-flex items-center gap-1"><Flag className="h-3 w-3" />{stop.country_name || stop.country_code || "Pays inconnu"}</span>
                          <span>{formatDate(stop.arrived_at)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {legacyVisits.length > 0 && (
        <section className="rounded-2xl border border-violet-500/20 bg-violet-500/10 p-5">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-violet-300" />
            <h2 className="font-semibold text-violet-100">Anciens voyages detectes</h2>
          </div>
          <p className="mt-2 text-sm text-violet-100/75">
            {legacyVisits.length} etapes ont ete creees avant le nouveau modele. Elles restent visibles dans la timeline.
          </p>
        </section>
      )}
    </div>
  );
}
