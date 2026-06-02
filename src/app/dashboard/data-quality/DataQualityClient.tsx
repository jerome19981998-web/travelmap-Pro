"use client";

import { useMemo, useState } from "react";
import type { Visit } from "@/types/database";
import { AlertTriangle, CheckCircle2, ClipboardCheck, Flag, MapPin, RefreshCw, Search, Sparkles, Wrench } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";

type IssueKind = "country" | "coords" | "name" | "type" | "memory";

type Issue = {
  id: string;
  kind: IssueKind;
  title: string;
  detail: string;
  priority: number;
};

const CITY_NAMES = new Set([
  "amsterdam", "antalya", "barcelone", "barcelona", "bazouges cre sur loir", "istanbul",
  "milan", "miami", "orlando", "paris",
]);

const COUNTRY_NAMES = new Set(["france", "espagne", "spain", "italie", "italy", "turquie", "turkey", "pays-bas", "netherlands"]);

function normalize(value: unknown): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function validCoord(value: unknown, min: number, max: number): boolean {
  const parsed = typeof value === "number" ? value : parseFloat(String(value));
  return Number.isFinite(parsed) && parsed >= min && parsed <= max;
}

function buildIssues(visit: Visit): Issue[] {
  const issues: Issue[] = [];
  const name = normalize(visit.place_name);

  if (!visit.country_code || !visit.country_name) {
    issues.push({
      id: "country",
      kind: "country",
      title: "Pays incomplet",
      detail: "Ce lieu risque de ne pas colorer le pays sur la carte.",
      priority: 1,
    });
  }

  if (!validCoord(visit.lat, -90, 90) || !validCoord(visit.lng, -180, 180)) {
    issues.push({
      id: "coords",
      kind: "coords",
      title: "Coordonnees invalides",
      detail: "Le point ne peut pas etre place correctement sur la carte.",
      priority: 1,
    });
  }

  if (/^\d+$/.test(name)) {
    issues.push({
      id: "name",
      kind: "name",
      title: "Nom trop vague",
      detail: "Renomme ce lieu pour eviter les listes avec seulement un numero.",
      priority: 2,
    });
  }

  if (visit.place_type === "landmark" && CITY_NAMES.has(name)) {
    issues.push({
      id: "type-city",
      kind: "type",
      title: "Devrait etre une ville",
      detail: "Ce lieu ressemble a une ville mais il est classe comme monument.",
      priority: 2,
    });
  }

  if (visit.place_type !== "country" && COUNTRY_NAMES.has(name)) {
    issues.push({
      id: "type-country",
      kind: "type",
      title: "Devrait etre un pays",
      detail: "Ce lieu ressemble a un pays entier.",
      priority: 2,
    });
  }

  if (visit.is_quick_memory) {
    issues.push({
      id: "memory",
      kind: "memory",
      title: "Souvenir a completer",
      detail: "Ajoute une date, une note ou une note personnelle quand tu as le temps.",
      priority: 3,
    });
  }

  return issues;
}

function kindStyle(kind: IssueKind): string {
  if (kind === "country") return "bg-emerald-500/10 text-emerald-300 border-emerald-500/20";
  if (kind === "coords") return "bg-red-500/10 text-red-300 border-red-500/20";
  if (kind === "name") return "bg-amber-500/10 text-amber-300 border-amber-500/20";
  if (kind === "type") return "bg-sky-500/10 text-sky-300 border-sky-500/20";
  return "bg-violet-500/10 text-violet-300 border-violet-500/20";
}

export default function DataQualityClient({ visits }: { visits: Visit[] }) {
  const [items, setItems] = useState(visits);
  const [filter, setFilter] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  const audited = useMemo(() => items.map((visit) => ({
    visit,
    issues: buildIssues(visit).sort((a, b) => a.priority - b.priority),
  })), [items]);

  const problematic = audited.filter((item) => item.issues.length > 0);
  const visible = problematic.filter(({ visit, issues }) => {
    const query = normalize(filter);
    if (!query) return true;
    return normalize([visit.place_name, visit.country_name, visit.country_code, ...issues.map((issue) => issue.title)].join(" ")).includes(query);
  });

  const updateVisit = async (visitId: string, patch: Partial<Visit>) => {
    setSavingId(visitId);
    const supabase = createClient();
    const visitsTable = supabase.from("visits") as any;
    const { error } = await visitsTable.update(patch).eq("id", visitId);
    setSavingId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    setItems((current) => current.map((visit) => visit.id === visitId ? { ...visit, ...patch } : visit));
    toast.success("Donnee corrigee");
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-[var(--text-primary)]">
            <ClipboardCheck className="h-6 w-6 text-emerald-400" />
            Donnees a verifier
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Les lignes douteuses sont regroupees ici pour garder la carte propre et fiable.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-xl border border-[var(--surface-border)] bg-white/[0.03] px-3 py-2">
            <div className="font-bold text-[var(--text-primary)]">{items.length}</div>
            <div className="text-[var(--text-muted)]">lieux</div>
          </div>
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2">
            <div className="font-bold text-amber-300">{problematic.length}</div>
            <div className="text-amber-200/80">a voir</div>
          </div>
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2">
            <div className="font-bold text-emerald-300">{items.length - problematic.length}</div>
            <div className="text-emerald-200/80">propres</div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-2xl border border-[var(--surface-border)] bg-white/[0.03] px-4 py-3">
        <Search className="h-4 w-4 text-[var(--text-muted)]" />
        <input
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder="Filtrer par lieu, pays ou probleme"
          className="w-full bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
        />
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-10 text-center">
          <CheckCircle2 className="mx-auto mb-4 h-10 w-10 text-emerald-300" />
          <h2 className="font-semibold text-[var(--text-primary)]">Tout est propre</h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">Aucune donnee suspecte ne ressort avec ce filtre.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {visible.map(({ visit, issues }) => (
            <article key={visit.id} className="rounded-2xl border border-[var(--surface-border)] bg-white/[0.03] p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold text-[var(--text-primary)]">{visit.place_name || "Lieu sans nom"}</h2>
                    <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-semibold uppercase text-[var(--text-muted)]">{visit.place_type || "type ?"}</span>
                  </div>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
                    <span className="inline-flex items-center gap-1"><Flag className="h-3 w-3" />{visit.country_name || "Pays manquant"} {visit.country_code ? `(${visit.country_code})` : ""}</span>
                    <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{String(visit.lat)}, {String(visit.lng)}</span>
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {issues.map((issue) => (
                      <span key={issue.id} className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs ${kindStyle(issue.kind)}`}>
                        <AlertTriangle className="h-3 w-3" />
                        {issue.title}
                      </span>
                    ))}
                  </div>
                  <div className="mt-3 space-y-1">
                    {issues.slice(0, 2).map((issue) => (
                      <p key={issue.id} className="text-xs text-[var(--text-muted)]">{issue.detail}</p>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 lg:justify-end">
                  {issues.some((issue) => issue.id === "type-city") && (
                    <button
                      onClick={() => updateVisit(visit.id, { place_type: "city" } as Partial<Visit>)}
                      disabled={savingId === visit.id}
                      className="inline-flex items-center gap-1 rounded-xl border border-sky-500/25 bg-sky-500/10 px-3 py-2 text-xs font-semibold text-sky-300 transition-colors hover:bg-sky-500/20 disabled:opacity-50"
                    >
                      <Wrench className="h-3.5 w-3.5" />
                      Marquer ville
                    </button>
                  )}
                  {issues.some((issue) => issue.id === "type-country") && (
                    <button
                      onClick={() => updateVisit(visit.id, { place_type: "country" } as Partial<Visit>)}
                      disabled={savingId === visit.id}
                      className="inline-flex items-center gap-1 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/20 disabled:opacity-50"
                    >
                      <Flag className="h-3.5 w-3.5" />
                      Marquer pays
                    </button>
                  )}
                  {visit.is_quick_memory && (
                    <button
                      onClick={() => updateVisit(visit.id, { is_quick_memory: false } as Partial<Visit>)}
                      disabled={savingId === visit.id}
                      className="inline-flex items-center gap-1 rounded-xl border border-violet-500/25 bg-violet-500/10 px-3 py-2 text-xs font-semibold text-violet-300 transition-colors hover:bg-violet-500/20 disabled:opacity-50"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Memoire completee
                    </button>
                  )}
                  {savingId === visit.id && <RefreshCw className="h-4 w-4 animate-spin text-[var(--text-muted)]" />}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
