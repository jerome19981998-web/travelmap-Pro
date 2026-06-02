"use client";

import { useState } from "react";
import { Search, Moon, Sun, Plus, X } from "lucide-react";
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

  const normalize = (value: string | null | undefined) =>
    (value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

  const handleSearch = (q: string) => {
    setSearchQuery(q);
    if (!q.trim()) { setResults([]); return; }
    const lower = normalize(q);
    const vResults = visits.filter((v) =>
      [v.place_name, v.country_name, v.place_type, v.notes].some((value) => normalize(value).includes(lower))
    );
    const wResults = wishlist.filter((w) =>
      [w.place_name, w.country_name, w.place_type, w.notes, w.priority].some((value) => normalize(value).includes(lower))
    );
    setResults([...vResults, ...wResults].slice(0, 6));
  };

  const selectResult = (item: Visit | WishlistItem) => {
    if (Number.isFinite(item.lat) && Number.isFinite(item.lng)) onFlyTo(item.lat!, item.lng!);
    setSearchQuery(""); setResults([]); setSearchOpen(false);
  };

  const isVisit = (item: Visit | WishlistItem): item is Visit => "rating" in item;

  const filters = [
    { value: "auto" as FilterMode, label: "⚡", color: "amber" },
    { value: "countries" as FilterMode, label: t.filterCountries, color: "emerald" },
    { value: "cities" as FilterMode, label: t.filterCities, color: "emerald" },
    { value: "neighborhoods" as FilterMode, label: t.filterNeighborhoods, color: "emerald" },
    { value: "wishlist" as FilterMode, label: t.filterWishlist, color: "violet" },
  ];

  const activeStyle = (value: FilterMode, color: string) => {
    if (filterMode !== value) return "glass text-[var(--text-secondary)] hover:text-[var(--text-primary)]";
    if (color === "violet") return "bg-violet-500/25 text-violet-200 border border-violet-400/40 shadow-[0_0_10px_rgba(139,92,246,0.3)]";
    if (color === "amber") return "bg-amber-500/25 text-amber-200 border border-amber-400/40 shadow-[0_0_10px_rgba(245,158,11,0.3)]";
    return "bg-emerald-500/25 text-emerald-200 border border-emerald-400/40 shadow-[0_0_10px_rgba(16,185,129,0.3)]";
  };

  return (
    <>
      {/* Top bar */}
      <div className="absolute top-3 left-3 right-3 z-10 flex items-center gap-2">
        {searchOpen ? (
          <div className="flex-1 glass rounded-xl overflow-hidden shadow-2xl">
            <div className="flex items-center gap-2 px-3 py-2">
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
                <X className="w-4 h-4 text-[var(--text-muted)]" />
              </button>
            </div>
            {results.length > 0 && (
              <div className="border-t border-[var(--surface-border)]">
                {results.map(item => (
                  <button key={item.id} onClick={() => selectResult(item)}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/5 text-left">
                    <span className="text-sm">{isVisit(item) ? "📍" : "💜"}</span>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-[var(--text-primary)] truncate">{item.place_name}</div>
