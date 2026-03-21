"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Visit, WishlistItem } from "@/types/database";
import MapControls, { type FilterMode } from "./MapControls";
import VisitPanel from "./VisitPanel";
import AddVisitModal from "./AddVisitModal";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { useLocale } from "@/hooks/useLocale";
import { Globe, Map } from "lucide-react";
import GlobeView from "./GlobeView";

interface Props {
  visits: (Visit & { visit_photos: { url: string; is_cover: boolean }[] })[];
  wishlist: WishlistItem[];
  userId: string;
  colorScheme: string;
}

function getVisitColor(count: number, scheme: string = "emerald"): string {
  const schemes: Record<string, string[]> = {
    emerald: ["#6ee7b7", "#34d399", "#10b981", "#059669", "#047857", "#065f46"],
    sky:     ["#7dd3fc", "#38bdf8", "#0ea5e9", "#0284c7", "#0369a1", "#075985"],
    violet:  ["#c4b5fd", "#a78bfa", "#8b5cf6", "#7c3aed", "#6d28d9", "#5b21b6"],
    rose:    ["#fda4af", "#fb7185", "#f43f5e", "#e11d48", "#be123c", "#9f1239"],
    amber:   ["#fde68a", "#fcd34d", "#f59e0b", "#d97706", "#b45309", "#92400e"],
    teal:    ["#99f6e4", "#5eead4", "#2dd4bf", "#14b8a6", "#0d9488", "#0f766e"],
  };
  const colors = schemes[scheme] || schemes.emerald;
  return colors[Math.min(Math.max(count - 1, 0), colors.length - 1)];
}

let geoCache: any = null;
async function fetchGeoJSON() {
  if (geoCache) return geoCache;
  const res = await fetch("https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson");
  geoCache = await res.json();
  return geoCache;
}

// Resolve effective filter based on zoom level for "auto" mode
function resolveFilter(filterMode: FilterMode, zoom: number): "countries" | "cities" | "neighborhoods" | "wishlist" {
  if (filterMode === "wishlist") return "wishlist";
  if (filterMode !== "auto") return filterMode;
  if (zoom <= 4) return "countries";
  if (zoom <= 8) return "cities";
  return "neighborhoods";
}

export default function TravelMap({ visits: initialVisits, wishlist: initialWishlist, userId, colorScheme }: Props) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const countryLayerRef = useRef<L.LayerGroup | null>(null);

  const [visits, setVisits] = useState(initialVisits);
  const [wishlist, setWishlist] = useState(initialWishlist);
  const [filterMode, setFilterMode] = useState<FilterMode>("auto");
  const [zoom, setZoom] = useState(2);
  const [isDark, setIsDark] = useState(true);
  const [isGlobe, setIsGlobe] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<(typeof visits)[0] | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addCoords, setAddCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { t } = useLocale();

  const effectiveFilter = resolveFilter(filterMode, zoom);

  // Init map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    const map = L.map(mapContainerRef.current, {
      center: [20, 0], zoom: 2, zoomControl: false, attributionControl: false,
    });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 19, subdomains: "abcd",
    }).addTo(map);
    countryLayerRef.current = L.layerGroup().addTo(map);
    markersLayerRef.current = L.layerGroup().addTo(map);
    map.on("click", e => {
      setAddCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
      setAddModalOpen(true);
    });
    map.on("zoomend", () => setZoom(map.getZoom()));
    L.control.zoom({ position: "bottomright" }).addTo(map);
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // Dark/light tiles
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.eachLayer(layer => {
      if (layer instanceof L.TileLayer) mapRef.current!.removeLayer(layer);
    });
    const url = isDark
      ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
    L.tileLayer(url, { maxZoom: 19, subdomains: "abcd" }).addTo(mapRef.current);
    if (countryLayerRef.current) countryLayerRef.current.addTo(mapRef.current);
    if (markersLayerRef.current) markersLayerRef.current.addTo(mapRef.current);
  }, [isDark]);

  // Country fills (GeoJSON)
  useEffect(() => {
    if (!countryLayerRef.current) return;
    countryLayerRef.current.clearLayers();

    const showCountryFills = effectiveFilter === "countries";
    if (!showCountryFills || visits.length === 0) return;

    const countryVisitCounts: Record<string, number> = {};
    visits.forEach(v => {
      if (v.country_code) {
        const code = v.country_code.toUpperCase();
        countryVisitCounts[code] = (countryVisitCounts[code] || 0) + 1;
      }
    });
    const visitedCodes = new Set(Object.keys(countryVisitCounts));
    const wishlistCodes = new Set(wishlist.map(w => w.country_code?.toUpperCase()).filter(Boolean) as string[]);

    fetchGeoJSON().then(geojson => {
      if (!countryLayerRef.current) return;

      L.geoJSON(geojson, {
        filter: (f: any) => visitedCodes.has(f.properties?.["ISO3166-1-Alpha-2"]?.toUpperCase()),
        style: (f: any) => {
          const code = f?.properties?.["ISO3166-1-Alpha-2"]?.toUpperCase();
          const count = countryVisitCounts[code] || 1;
          const color = getVisitColor(count, colorScheme);
          return { fillColor: color, fillOpacity: 0.45, color, weight: 1.5, opacity: 0.7 };
        },
        onEachFeature: (f: any, layer: any) => {
          const code = f.properties?.["ISO3166-1-Alpha-2"]?.toUpperCase();
          const count = countryVisitCounts[code] || 0;
          layer.bindTooltip(
            `<div style="font-weight:700;font-size:13px">${f.properties?.name}</div>
             <div style="font-size:11px;opacity:0.7;margin-top:2px">${count} visite${count > 1 ? "s" : ""}</div>`,
            { className: "map-tooltip", sticky: true }
          );
          layer.on("click", (e: any) => {
            L.DomEvent.stopPropagation(e);
            const v = visits.find(v => v.country_code?.toUpperCase() === code);
            if (v) setSelectedVisit(v);
          });
        },
      }).addTo(countryLayerRef.current);

      L.geoJSON(geojson, {
        filter: (f: any) => {
          const code = f.properties?.["ISO3166-1-Alpha-2"]?.toUpperCase();
          return wishlistCodes.has(code) && !visitedCodes.has(code);
        },
        style: () => ({ fillColor: "#8b5cf6", fillOpacity: 0.12, color: "#8b5cf6", weight: 1.5, opacity: 0.5, dashArray: "5 5" }),
      }).addTo(countryLayerRef.current);
    }).catch(console.error);
  }, [visits, wishlist, effectiveFilter, colorScheme]);

  // City / neighborhood markers
  const renderMarkers = useCallback(() => {
    if (!markersLayerRef.current) return;
    markersLayerRef.current.clearLayers();

    const countryVisitCounts: Record<string, number> = {};
    visits.forEach(v => {
      if (v.country_code) {
        const code = v.country_code.toUpperCase();
        countryVisitCounts[code] = (countryVisitCounts[code] || 0) + 1;
      }
    });

    if (effectiveFilter !== "wishlist") {
      visits.forEach(visit => {
        if (!visit.lat || !visit.lng) return;
        const type = visit.place_type;
        const isNeighborhood = type === "neighborhood";
        if (effectiveFilter === "countries") return;
        if (effectiveFilter === "cities" && isNeighborhood) return;
        if (effectiveFilter === "neighborhoods" && !isNeighborhood) return;

        const coverPhoto = visit.visit_photos?.find(p => p.is_cover)?.url || visit.visit_photos?.[0]?.url;
        const visitCount = countryVisitCounts[visit.country_code?.toUpperCase() || ""] || 1;
        const color = getVisitColor(visitCount, colorScheme);
        const size = isNeighborhood ? 8 : 12;

        const icon = L.divIcon({
          className: "",
          html: coverPhoto
            ? `<div style="width:38px;height:38px;border-radius:50%;overflow:hidden;border:2.5px solid ${color};box-shadow:0 0 0 3px ${color}50,0 4px 16px rgba(0,0,0,0.6)"><img src="${coverPhoto}" style="width:100%;height:100%;object-fit:cover"/></div>`
            : `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid rgba(255,255,255,0.5);box-shadow:0 0 0 3px ${color}45,0 0 14px ${color}70;animation:pulse-marker 2s ease-in-out infinite;"></div>`,
          iconSize: coverPhoto ? [38, 38] : [size, size],
          iconAnchor: coverPhoto ? [19, 19] : [size / 2, size / 2],
        });

        const marker = L.marker([visit.lat, visit.lng], { icon });
        marker.on("click", e => {
          L.DomEvent.stopPropagation(e);
          setSelectedVisit(visit);
          // Haptic feedback on mobile
          if (navigator.vibrate) navigator.vibrate(30);
        });

        const stars = visit.rating ? "★".repeat(visit.rating) + "☆".repeat(5 - visit.rating) : null;
        marker.bindTooltip(
          `<div style="min-width:130px">
            <div style="font-weight:700;font-size:13px;margin-bottom:3px">${visit.place_name}</div>
            ${visit.country_name ? `<div style="font-size:11px;opacity:0.65">${visit.country_name}</div>` : ""}
            ${visit.visited_at ? `<div style="font-size:11px;opacity:0.55;margin-top:4px">${new Date(visit.visited_at).toLocaleDateString("fr-FR", { year: "numeric", month: "short" })}</div>` : ""}
            ${stars ? `<div style="font-size:12px;color:#f59e0b;margin-top:3px">${stars}</div>` : ""}
          </div>`,
          { className: "map-tooltip", direction: "top", offset: [0, -10] }
        );
        markersLayerRef.current!.addLayer(marker);
      });
    }

    // Wishlist markers
    if (effectiveFilter === "countries" || effectiveFilter === "cities" || effectiveFilter === "neighborhoods" || effectiveFilter === "wishlist") {
      const showWishlist = effectiveFilter === "wishlist" ||
        filterMode === "auto" ||
        filterMode === "wishlist";

      if (showWishlist || effectiveFilter !== "countries") {
        wishlist.forEach(item => {
          if (!item.lat || !item.lng) return;
          if (effectiveFilter !== "wishlist" && filterMode !== "auto") return;
          const pc = item.priority === "high" ? "#ef4444" : item.priority === "low" ? "#6b7280" : "#8b5cf6";
          const icon = L.divIcon({
            className: "",
            html: `<div style="width:10px;height:10px;border-radius:50%;background:${pc};border:2px solid rgba(255,255,255,0.5);box-shadow:0 0 0 3px ${pc}40"></div>`,
            iconSize: [10, 10], iconAnchor: [5, 5],
          });
          const marker = L.marker([item.lat, item.lng], { icon });
          marker.bindTooltip(
            `<div style="min-width:120px"><div style="font-weight:700;font-size:13px">💜 ${item.place_name}</div>${item.country_name ? `<div style="font-size:11px;opacity:0.65">${item.country_name}</div>` : ""}</div>`,
            { className: "map-tooltip", direction: "top", offset: [0, -10] }
          );
          markersLayerRef.current!.addLayer(marker);
        });
      }
    }
  }, [visits, wishlist, effectiveFilter, filterMode, colorScheme]);

  useEffect(() => { renderMarkers(); }, [renderMarkers]);

  const handleVisitAdded = async () => {
    const supabase = createClient();
    const { data } = await supabase.from("visits").select("*, visit_photos(*)").eq("user_id", userId).order("visited_at", { ascending: false });
    if (data) setVisits(data as typeof visits);
    toast.success("✈️ " + t.saveVisit);
    if (navigator.vibrate) navigator.vibrate([30, 20, 30]);
  };

  const handleWishlistAdded = async () => {
    const supabase = createClient();
    const { data } = await supabase.from("wishlist").select("*").eq("user_id", userId);
    if (data) setWishlist(data);
    toast.success("💜 " + t.addToWishlist);
  };

  const flyToVisit = useCallback((lat: number, lng: number) => {
    mapRef.current?.flyTo([lat, lng], 8, { duration: 1.5 });
  }, []);

  return (
    <div className="relative w-full h-full bg-[var(--map-bg)]">

      {/* Globe/Map toggle */}
<div className="absolute top-4 right-4 z-[9999] flex items-center glass rounded-xl overflow-hidden border border-[var(--surface-border)] shadow-lg lg:flex hidden" style={{ pointerEvents: "all" }}>
        <button
          onClick={() => setIsGlobe(false)}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${!isGlobe ? "bg-emerald-500/20 text-emerald-300" : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"}`}
        >
          <Map className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Carte</span>
        </button>
        <div className="w-px h-5 bg-[var(--surface-border)]" />
        <button
          onClick={() => setIsGlobe(true)}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${isGlobe ? "bg-emerald-500/20 text-emerald-300" : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"}`}
        >
          <Globe className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Globe</span>
        </button>
      </div>

      {isGlobe ? (
        <div className="absolute inset-0 flex items-center justify-center bg-[var(--surface-bg)]">
          <GlobeView
            visits={visits}
            wishlist={wishlist}
            colorScheme={colorScheme}
            isDark={isDark}
            filterMode={effectiveFilter}
            onVisitClick={setSelectedVisit}
          />
          <div className="absolute top-16 left-4 z-10 flex items-center gap-2 flex-wrap">
            {(["auto", "countries", "cities", "neighborhoods", "wishlist"] as FilterMode[]).map(f => (
              <button key={f} onClick={() => setFilterMode(f)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all shadow-lg flex-shrink-0 ${
                  filterMode === f
                    ? f === "wishlist" ? "bg-violet-500/20 text-violet-300 border border-violet-500/30"
                    : f === "auto" ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                    : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : "glass text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}>
                {f === "auto" ? "⚡ Auto" : f === "countries" ? "🌍 Pays" : f === "cities" ? "🏙 Villes" : f === "neighborhoods" ? "🏘 Quartiers" : "💜 Wishlist"}
              </button>
            ))}
          </div>
          <div className="absolute bottom-10 left-4 z-10 glass rounded-xl px-3 py-2 text-xs text-[var(--text-secondary)]">
            🌍 Glisse pour tourner
          </div>
          {selectedVisit && (
            <div className="absolute right-0 top-0 bottom-0 z-20 w-full max-w-sm glass-elevated border-l border-[var(--surface-border)] p-5 overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-[var(--text-primary)]">{selectedVisit.place_name}</h2>
                <button onClick={() => setSelectedVisit(null)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-lg">✕</button>
              </div>
              {selectedVisit.country_name && <p className="text-sm text-[var(--text-secondary)] mb-3">{selectedVisit.country_name}</p>}
              {selectedVisit.visited_at && <p className="text-xs text-[var(--text-muted)]">{new Date(selectedVisit.visited_at).toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric" })}</p>}
              {selectedVisit.notes && <p className="text-sm text-[var(--text-secondary)] mt-3 italic">&quot;{selectedVisit.notes}&quot;</p>}
              {selectedVisit.rating && <div className="text-amber-400 mt-3 text-lg">{"★".repeat(selectedVisit.rating)}{"☆".repeat(5 - selectedVisit.rating)}</div>}
            </div>
          )}
        </div>
      ) : (
        <>
          <div ref={mapContainerRef} className="absolute inset-0 z-0" />
          <MapControls
            filterMode={filterMode} setFilterMode={setFilterMode}
            isDark={isDark} setIsDark={setIsDark}
            visits={visits} wishlist={wishlist}
            onFlyTo={flyToVisit}
            onAddVisit={() => { setAddCoords(null); setAddModalOpen(true); }}
            searchQuery={searchQuery} setSearchQuery={setSearchQuery}
          />
          {selectedVisit && (
            <VisitPanel visit={selectedVisit} onClose={() => setSelectedVisit(null)} onUpdated={handleVisitAdded} userId={userId} />
          )}
          {addModalOpen && (
            <AddVisitModal
              coords={addCoords} userId={userId}
              onClose={() => { setAddModalOpen(false); setAddCoords(null); }}
              onVisitAdded={handleVisitAdded} onWishlistAdded={handleWishlistAdded}
            />
          )}

          {/* Auto mode indicator */}
          {filterMode === "auto" && (
            <div className="absolute top-[104px] left-4 z-10 glass rounded-lg px-2.5 py-1 text-[10px] text-amber-400 border border-amber-500/20">
              ⚡ Auto — {effectiveFilter === "countries" ? "Pays" : effectiveFilter === "cities" ? "Villes" : "Quartiers"}
            </div>
          )}

          <div className="absolute bottom-10 left-4 z-10 glass rounded-xl px-3 py-2 flex items-center gap-4 text-xs text-[var(--text-secondary)]">
            <span className="font-medium text-[var(--text-muted)]">{t.legend}</span>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
              <span>{t.visited} ({visits.length})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-violet-500 shadow-[0_0_6px_rgba(139,92,246,0.5)]" />
              <span>{t.wishlistLabel} ({wishlist.length})</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
