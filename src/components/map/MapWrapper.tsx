"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { Visit, WishlistItem } from "@/types/database";
import GlobeView from "./GlobeView";
import { Globe, Map } from "lucide-react";
import type { FilterMode } from "./MapControls";

const TravelMap = dynamic(() => import("./TravelMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[var(--map-bg)]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
        <p className="text-sm text-[var(--text-secondary)]">Chargement de la carte...</p>
      </div>
    </div>
  ),
});

interface Props {
  visits: (Visit & { visit_photos: { url: string; is_cover: boolean }[] })[];
  wishlist: WishlistItem[];
  userId: string;
  colorScheme: string;
}

export default function MapWrapper({ visits, wishlist, userId, colorScheme }: Props) {
  const [isGlobe, setIsGlobe] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [selectedVisit, setSelectedVisit] = useState<typeof visits[0] | null>(null);

  return (
    <div className="relative w-full h-full">
      {/* Toggle button */}
      <div className="absolute top-4 right-4 z-20 flex items-center glass rounded-xl overflow-hidden border border-[var(--surface-border)] shadow-lg">
        <button
          onClick={() => setIsGlobe(false)}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${
            !isGlobe ? "bg-emerald-500/20 text-emerald-300" : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
          }`}
        >
          <Map className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Carte</span>
        </button>
        <div className="w-px h-5 bg-[var(--surface-border)]" />
        <button
          onClick={() => setIsGlobe(true)}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${
            isGlobe ? "bg-emerald-500/20 text-emerald-300" : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Globe</span>
        </button>
      </div>

      {/* Map or Globe */}
      <div className="w-full h-full transition-opacity duration-300">
        {isGlobe ? (
          <div className="w-full h-full flex items-center justify-center bg-[var(--surface-bg)]">
            <GlobeView
              visits={visits}
              wishlist={wishlist}
              colorScheme={colorScheme}
              isDark={isDark}
              filterMode={filterMode}
              onVisitClick={setSelectedVisit}
            />

            {/* Globe controls */}
            <div className="absolute bottom-10 left-4 z-10 glass rounded-xl px-3 py-2 flex items-center gap-4 text-xs text-[var(--text-secondary)]">
              <span className="text-[var(--text-muted)]">🌍 Glisse pour tourner</span>
            </div>

            {/* Filter pills for globe */}
            <div className="absolute top-16 left-4 z-10 flex items-center gap-2 flex-wrap">
              {(["all", "countries", "cities", "neighborhoods", "wishlist"] as FilterMode[]).map(f => (
                <button
                  key={f}
                  onClick={() => setFilterMode(f)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all shadow-lg capitalize ${
                    filterMode === f
                      ? f === "wishlist"
                        ? "bg-violet-500/20 text-violet-300 border border-violet-500/30"
                        : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "glass text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {f === "all" ? "Tout" : f === "countries" ? "Pays" : f === "cities" ? "Villes" : f === "neighborhoods" ? "Quartiers" : "Wishlist"}
                </button>
              ))}
            </div>

            {/* Visit panel for globe */}
            {selectedVisit && (
              <div className="absolute right-0 top-0 bottom-0 z-20 w-full max-w-sm glass-elevated border-l border-[var(--surface-border)] p-5 overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold text-[var(--text-primary)]">{selectedVisit.place_name}</h2>
                  <button onClick={() => setSelectedVisit(null)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">✕</button>
                </div>
                {selectedVisit.country_name && (
                  <p className="text-sm text-[var(--text-secondary)] mb-3">{selectedVisit.country_name}</p>
                )}
                {selectedVisit.visited_at && (
                  <p className="text-xs text-[var(--text-muted)]">
                    {new Date(selectedVisit.visited_at).toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric" })}
                  </p>
                )}
                {selectedVisit.notes && (
                  <p className="text-sm text-[var(--text-secondary)] mt-3 italic">&quot;{selectedVisit.notes}&quot;</p>
                )}
                {selectedVisit.rating && (
                  <div className="text-amber-400 mt-3">{"★".repeat(selectedVisit.rating)}{"☆".repeat(5 - selectedVisit.rating)}</div>
                )}
              </div>
            )}
          </div>
        ) : (
          <TravelMap
            visits={visits}
            wishlist={wishlist}
            userId={userId}
            colorScheme={colorScheme}
          />
        )}
      </div>
    </div>
  );
}
