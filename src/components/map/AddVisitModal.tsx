"use client";

import { useState, useEffect } from "react";
import { X, Search, Zap, Heart, MapPin, Loader } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { useLocale } from "@/hooks/useLocale";

interface NominatimResult {
  place_id: number;
  name?: string;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  class?: string;
  address: {
    country?: string;
    country_code?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    borough?: string;
    city_district?: string;
    district?: string;
    county?: string;
    suburb?: string;
    quarter?: string;
    neighbourhood?: string;
    neighborhood?: string;
    road?: string;
    pedestrian?: string;
    tourism?: string;
    attraction?: string;
    hamlet?: string;
    state?: string;
    region?: string;
  };
}

interface Props {
  coords: { lat: number; lng: number } | null;
  userId: string;
  onClose: () => void;
  onVisitAdded: () => void;
  onWishlistAdded: () => void;
}

type Mode = "visit" | "quick" | "wishlist";

const CONTINENTS: Record<string, string> = {
  fr: "Europe", de: "Europe", es: "Europe", it: "Europe", gb: "Europe", pt: "Europe", nl: "Europe",
  pl: "Europe", cz: "Europe", at: "Europe", ch: "Europe", be: "Europe", se: "Europe", no: "Europe",
  dk: "Europe", fi: "Europe", gr: "Europe", hu: "Europe", ro: "Europe", bg: "Europe", hr: "Europe",
  us: "Americas", ca: "Americas", mx: "Americas", br: "Americas", ar: "Americas", cl: "Americas",
  co: "Americas", pe: "Americas", ve: "Americas", cu: "Americas", bo: "Americas", py: "Americas",
  cn: "Asia", jp: "Asia", kr: "Asia", in: "Asia", th: "Asia", vn: "Asia", id: "Asia",
  ph: "Asia", my: "Asia", sg: "Asia", ae: "Asia", sa: "Asia", il: "Asia", tr: "Asia",
  eg: "Africa", za: "Africa", ma: "Africa", ng: "Africa", et: "Africa", ke: "Africa", gh: "Africa",
  au: "Oceania", nz: "Oceania",
};

export default function AddVisitModal({ coords, userId, onClose, onVisitAdded, onWishlistAdded }: Props) {
  const [mode, setMode] = useState<Mode>("visit");
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [selected, setSelected] = useState<NominatimResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [visitedAt, setVisitedAt] = useState("");
  const [departedAt, setDepartedAt] = useState("");
  const [notes, setNotes] = useState("");
  const [rating, setRating] = useState(0);
  const [priority, setPriority] = useState<"high" | "medium" | "low">("medium");
  const [targetYear, setTargetYear] = useState("");
  const { t } = useLocale();

  // If coords provided, reverse geocode
  useEffect(() => {
    if (!coords) return;
    setLoading(true);
    fetch(`https://nominatim.openstreetmap.org/reverse?lat=${coords.lat}&lon=${coords.lng}&format=json&addressdetails=1&zoom=18&accept-language=fr,en`)
      .then((r) => r.json())
      .then((data: NominatimResult) => {
        setSelected(data);
        setSearchQuery(getPlaceName(data));
      })
      .catch(() => toast.error("Impossible d'identifier ce lieu"))
      .finally(() => setLoading(false));
  }, [coords]);

  const searchPlaces = async () => {
    const query = searchQuery.trim();
    if (query.length < 2) return;
    setLoading(true);
    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=8&addressdetails=1&dedupe=1&accept-language=fr,en`
      );
      const data: NominatimResult[] = await r.json();
      setResults(data.filter((place) => Number.isFinite(parseFloat(place.lat)) && Number.isFinite(parseFloat(place.lon))));
    } catch {
      toast.error("Recherche impossible");
    } finally {
      setLoading(false);
    }
  };

  const getPlaceName = (r: NominatimResult) => {
    const address = r.address || {};
    if (["country", "nation"].includes(r.type)) return address.country || r.name || "Lieu inconnu";
    const preciseName =
      address.neighbourhood ||
      address.neighborhood ||
      address.quarter ||
      address.suburb ||
      address.city_district ||
      address.district ||
      address.borough ||
      address.city ||
      address.town ||
      address.village ||
      address.municipality ||
      address.hamlet ||
      r.name;
    return preciseName?.trim() || r.display_name?.split(",")[0]?.trim() || "Lieu inconnu";
  };
  const getCountryName = (r: NominatimResult) => r.address?.country || "";
  const getCountryCode = (r: NominatimResult) => (r.address?.country_code || "").toUpperCase();
  const getContinent = (r: NominatimResult) => CONTINENTS[(r.address?.country_code || "").toLowerCase()] || "Unknown";
  const getPlaceType = (r: NominatimResult): string => {
    const type = r.type;
    const itemClass = r.class;
    const address = r.address || {};
    const name = getPlaceName(r).toLowerCase();
    const countryName = getCountryName(r).toLowerCase();
    const hasNeighborhoodSignal = Boolean(
      address.neighbourhood ||
      address.neighborhood ||
      address.quarter ||
      address.suburb ||
      address.city_district ||
      address.district
    );
    const hasCitySignal = Boolean(address.city || address.town || address.village || address.municipality || address.borough || address.hamlet);
    const hasLandmarkSignal = Boolean(address.road || address.pedestrian || address.tourism || address.attraction);

    if (name === countryName || type === "country" || type === "nation") return "country";
    if (hasNeighborhoodSignal || ["suburb", "quarter", "neighbourhood", "neighborhood", "district", "city_district"].includes(type)) return "neighborhood";
    if (hasCitySignal || ["city", "town", "village", "municipality", "borough", "hamlet", "locality"].includes(type)) return "city";
    if (hasLandmarkSignal || ["tourism", "attraction", "museum", "hotel", "restaurant", "cafe", "bar", "monument", "viewpoint"].includes(type) || itemClass === "tourism" || itemClass === "amenity") return "landmark";
    if (["state", "region", "province", "county"].includes(type)) return "region";
    if (type === "administrative") return hasCitySignal ? "city" : "region";
    return "landmark";
  };

  const handleSave = async () => {
    const place = selected || (results[0] || null);
    if (!place) { toast.error("Sélectionnez un lieu"); return; }
    if (visitedAt && departedAt && departedAt < visitedAt) {
      toast.error("La date de départ doit être après l'arrivée");
      return;
    }
    setSaving(true);
    const supabase = createClient();

    const lat = parseFloat(place.lat);
    const lng = parseFloat(place.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      toast.error("Coordonnées invalides pour ce lieu");
      setSaving(false);
      return;
    }
    const placeName = getPlaceName(place);
    const countryCode = getCountryCode(place);
    const countryName = getCountryName(place);
    const continent = getContinent(place);
    const placeType = getPlaceType(place);

    try {
      if (mode === "wishlist") {
        const wishlistTable = supabase.from("wishlist") as any;
        const { error } = await wishlistTable.insert({
          user_id: userId, place_name: placeName, place_type: placeType,
          country_code: countryCode || null, country_name: countryName || null,
          continent: continent || null, lat, lng,
          priority, notes: notes || null,
          target_year: targetYear ? parseInt(targetYear) : null,
        });
        if (error) toast.error(error.message);
        else { onWishlistAdded(); onClose(); }
      } else {
        const visitsTable = supabase.from("visits") as any;
        const { error } = await visitsTable.insert({
          user_id: userId, place_name: placeName, place_type: placeType,
          country_code: countryCode || null, country_name: countryName || null,
          continent: continent || null, lat, lng,
          visited_at: visitedAt || null,
          departed_at: departedAt || null,
          notes: notes || null,
          rating: rating || null,
          is_quick_memory: mode === "quick",
        });
        if (error) toast.error(error.message);
        else { onVisitAdded(); onClose(); }
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md glass-elevated rounded-2xl shadow-2xl animate-scale-in overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--surface-border)]">
          <h2 className="font-bold text-[var(--text-primary)]">{t.addAPlace}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Mode selector */}
          <div className="flex rounded-xl overflow-hidden border border-[var(--surface-border)]">
            {([
              { value: "visit", icon: MapPin, label: t.visit },
              { value: "quick", icon: Zap, label: t.quickMemory },
              { value: "wishlist", icon: Heart, label: t.wishlistAdd },
            ] as const).map(({ value, icon: Icon, label }) => (
              <button
                key={value}
                onClick={() => setMode(value)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
                  mode === value
                    ? value === "wishlist"
                      ? "bg-violet-500/20 text-violet-300"
                      : "bg-emerald-500/20 text-emerald-300"
                    : "bg-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div>
            <div className="flex gap-2">
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchPlaces()}
                placeholder={t.searchForPlace}
                className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-[var(--surface-border)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-emerald-500/50"
              />
              <button
                onClick={searchPlaces}
                disabled={loading}
                className="px-4 py-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 transition-colors"
              >
                {loading ? <Loader className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </button>
            </div>

            {results.length > 0 && !selected && (
              <div className="mt-2 rounded-xl border border-[var(--surface-border)] overflow-hidden">
                {results.map((r) => (
                  <button
                    key={r.place_id}
                    onClick={() => { setSelected(r); setResults([]); setSearchQuery(getPlaceName(r)); }}
                    className="w-full flex items-start gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors text-left border-b border-[var(--surface-border)] last:border-0"
                  >
                    <MapPin className="w-4 h-4 text-[var(--text-muted)] mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-sm font-medium text-[var(--text-primary)]">{getPlaceName(r)}</div>
                      <div className="text-xs text-[var(--text-muted)] truncate">{r.display_name}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {selected && (
              <div className="mt-2 flex items-center justify-between px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-sm text-emerald-300">{getPlaceName(selected)}</span>
                  {getCountryName(selected) && (
                    <span className="text-xs text-[var(--text-muted)]">· {getCountryName(selected)}</span>
                  )}
                </div>
                <button onClick={() => { setSelected(null); setSearchQuery(""); }} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Quick memory shortcut */}
          {mode === "quick" && (
            <div className="px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-sm text-amber-300">
              {t.quickMemoryNote}
            </div>
          )}

          {/* Visit fields */}
          {mode === "visit" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[var(--text-muted)] mb-1.5">{t.arrived}</label>
                  <input type="date" value={visitedAt} onChange={(e) => setVisitedAt(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-[var(--surface-border)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-emerald-500/50" />
                </div>
                <div>
                  <label className="block text-xs text-[var(--text-muted)] mb-1.5">{t.departed}</label>
                  <input type="date" value={departedAt} onChange={(e) => setDepartedAt(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-[var(--surface-border)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-emerald-500/50" />
                </div>
              </div>

              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1.5">{t.rating}</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button key={s} onClick={() => setRating(s === rating ? 0 : s)}
                      className="text-2xl transition-transform hover:scale-125">
                      {s <= rating ? "⭐" : "☆"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1.5">{t.notes}</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
                  placeholder={t.writePlaceholder}
                  className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-[var(--surface-border)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-emerald-500/50 resize-none" />
              </div>
            </>
          )}

          {/* Wishlist fields */}
          {mode === "wishlist" && (
            <>
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1.5">{t.priority}</label>
                <div className="flex gap-2">
                  {(["high", "medium", "low"] as const).map((p) => (
                    <button key={p} onClick={() => setPriority(p)}
                      className={`flex-1 py-2 rounded-xl text-xs font-medium capitalize border transition-colors ${
                        priority === p
                          ? p === "high" ? "bg-red-500/20 text-red-300 border-red-500/30"
                          : p === "low" ? "bg-gray-500/20 text-gray-300 border-gray-500/30"
                          : "bg-violet-500/20 text-violet-300 border-violet-500/30"
                          : "bg-white/5 text-[var(--text-muted)] border-[var(--surface-border)]"
                      }`}
                    >
                      {p === "high" ? t.high : p === "medium" ? t.medium : t.low}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1.5">{t.targetYear}</label>
                <input type="number" value={targetYear} onChange={(e) => setTargetYear(e.target.value)}
                  placeholder={new Date().getFullYear().toString()}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-[var(--surface-border)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-violet-500/50" />
              </div>

              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1.5">{t.notes}</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
                  placeholder="Pourquoi voulez-vous y aller ?"
                  className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-[var(--surface-border)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-violet-500/50 resize-none" />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-[var(--surface-border)] flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-sm text-[var(--text-secondary)] transition-colors">
            {t.cancel}
          </button>
          <button onClick={handleSave} disabled={saving}
            className={`flex-1 py-2.5 rounded-xl text-white text-sm font-semibold transition-colors disabled:opacity-50 ${
              mode === "wishlist" ? "bg-violet-500 hover:bg-violet-400" : "bg-emerald-500 hover:bg-emerald-400"
            }`}>
            {saving ? t.saving : mode === "wishlist" ? t.addToWishlist : t.saveVisit}
          </button>
        </div>
      </div>
    </div>
  );
}
