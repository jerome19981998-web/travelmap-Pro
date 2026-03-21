"use client";

import { useState, useRef } from "react";
import { Search, Moon, Sun, Plus, Map, Heart, Globe, Building2, Home, X, Zap } from "lucide-react";
import type { Visit, WishlistItem } from "@/types/database";
import { clsx } from "clsx";
import { useLocale } from "@/hooks/useLocale";

export type FilterMode = "auto" | "countries" | "cities" | "neighborhoods" | "wishlist";

interface Props {
  filterMode: FilterMode;
  setFilterMode: (m: FilterMode) => void;
  isDark: boolean;
  setIsDark: (v: boolean) => void;
  visits: Visit[];
  wishlist: WishlistItem[];
  onFlyTo: (lat: number, lng: number) => void;
  onAddVisit: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}

export default function MapControls({
  filterMode, setFilterMode, isDark, setIsDark,
  visits, wishlist, onFlyTo, onAddVisit, searchQuery, setSearchQuery,
}: Props) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [results, setResults] = useState<(Visit | WishlistItem)[]>([]);
  const { t } = useLocale();
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleSearch = (q: string) => {
    setSearchQuery(q);
    if (!q.trim()) { setResults([]); return; }
    const lower = q.toLowerCase();
    const vResults = visits.filter(v =>
      v.place_name.toLowerCase().includes(lower) ||
      v.country_name?.toLowerCase().includes(lower)
    );
    const wResults = wishlist.filter(w =>
      w.place_name.toLowerCase().includes(lower) ||
      w.country_name?.toLowerCase().includes(lower)
    );
    setResults([...vResults, ...wResults].slice(0, 6));
  };

  const selectResult = (item: Visit | WishlistItem) => {
    if (item.lat && item.lng) onFlyTo(item.lat, item.lng);
    setSearchQuery(""); setResults([]); setSearchOpen(false);
  };

  const isVisit = (item: Visit | WishlistItem): item is Visit => "rating" in item;

  const filters = [
    { value: "auto" as FilterMode, icon: Zap, label: "Auto", color: "amber" },
    { value: "countries" as FilterMode, icon: Globe, label: t.filterCountries, color: "emerald" },
    { value: "cities" as FilterMode, icon: Building2, label: t.filterCities, color: "emerald" },
    { value: "neighborhoods" as FilterMode, icon: Home, label: t.filterNeighborhoods, color: "emerald" },
    { value: "wishlist" as FilterMode, icon: Heart, label: t.filterWishlist, color: "violet" },
  ];

  const activeStyle = (value: FilterMode, color: string) => {
    if (filterMode !== value) return "glass text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/10";
    if (color === "violet") return "bg-violet-500/25 text-violet-200 border border-violet-400/40 shadow-[0_0_12px_rgba(139,92,246,0.3)]";
    if (color === "amber") return "bg-amber-500/25 text-amber-200 border border-amber-400/40 shadow-[0_0_12px_rgba(245,158,11,0.3)]";
    return "bg-emerald-500/25 text-emerald-200 border border-emerald-400/40 shadow-[0_0_12px_rgba(16,185,129,0.3)]";
  };

  return (
    <>
      {/* Top bar — search + dark mode */}
      <div className="absolute top-4 left-4 right-4 z-10 flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          {searchOpen ? (
            <div className="glass rounded-2xl overflow-hidden shadow-2xl">
              <div className="flex items-center gap-2 px-4 py-3">
                <Search className="w-4 h-4 text-[var(--text-muted)] flex-shrink-0" />
                <input
                  autoFocus
                  value={searchQuery}
                  onChange={e => handleSearch(e.target.value)}
                  onKeyDown={e => e.key === "Escape" && setSearchOpen(false)}
                  placeholder={t.searchPlaces}
                  className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none"
                />
                <button onClick={() => { setSearchOpen(false); setResults([]); setSearchQuery(""); }}>
                  <X className="w-4 h-4 text-[var(--text-muted)] hover:text-[var(--text-primary)]" />
                </button>
              </div>
              {results.length > 0 && (
                <div className="border-t border-[var(--surface-border)]">
                  {results.map(item => (
                    <button key={item.id} onClick={() => selectResult(item)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors text-left">
                      <span className="text-base">{isVisit(item) ? "📍" : "💜"}</span>
                      <div>
                        <div className="text-sm font-medium text-[var(--text-primary)]">{item.place_name}</div>
                        {item.country_name && <div className="text-xs text-[var(--text-muted)]">{item.country_name}</div>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 glass rounded-2xl px-4 py-2.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors shadow-lg w-full"
            >
              <Search className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{t.searchPlaces}</span>
            </button>
          )}
        </div>

        <button
          onClick={() => setIsDark(!isDark)}
          className="glass rounded-xl p-2.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors shadow-lg flex-shrink-0"
          title={isDark ? t.lightMode : t.darkMode}
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>

      {/* Filter bar — scrollable horizontal */}
      <div className="absolute top-16 left-0 right-0 z-10">
        {/* Fade left */}
        <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-black/20 to-transparent z-10 pointer-events-none rounded-l-xl" />
        {/* Fade right */}
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-black/30 to-transparent z-10 pointer-events-none" />

        <div
          ref={scrollRef}
          className="flex items-center gap-2 px-4 overflow-x-auto scrollbar-hide"
          style={{ WebkitOverflowScrolling: "touch", scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {filters.map(({ value, icon: Icon, label, color }) => (
            <button
              key={value}
              onClick={() => setFilterMode(value)}
              className={clsx(
                "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 flex-shrink-0 active:scale-95",
                activeStyle(value, color)
              )}
            >
              <Icon className="w-3.5 h-3.5 flex-shrink-0" />
              {label}
            </button>
          ))}
          {/* Spacer to ensure last button fully visible */}
          <div className="w-4 flex-shrink-0" />
        </div>
      </div>

      {/* FAB — Floating Add Button (mobile) */}
      <button
        onClick={onAddVisit}
        className="absolute bottom-20 right-4 z-20 lg:hidden w-14 h-14 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-xl shadow-emerald-500/30 flex items-center justify-center text-2xl active:scale-95 transition-transform hover:shadow-emerald-500/50"
        title={t.addPlace}
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Desktop add button */}
      <button
        onClick={onAddVisit}
        className="absolute top-4 right-4 z-20 hidden lg:flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl px-4 py-2.5 text-sm font-semibold transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
      >
        <Plus className="w-4 h-4" />
        <span>{t.addPlace}</span>
      </button>
    </>
  );
}
