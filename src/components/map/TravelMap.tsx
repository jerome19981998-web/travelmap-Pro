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
  const res = await fetch(
    "https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson"
  );
  geoCache = await res.json();
  return geoCache;
}

export default function TravelMap({ visits: initialVisits, wishlist: initialWishlist, userId, colorScheme }: Props) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const countryLayerRef = useRef<L.LayerGroup | null>(null);

  const [visits, setVisits] = useState(initialVisits);
  const [wishlist, setWishlist] = useState(initialWishlist);
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [isDark, setIsDark] = useState(true);
  const [selectedVisit, setSelectedVisit] = useState<(typeof visits)[0] | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addCoords, setAddCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { t } = useLocale();

  // ── Init map ──────────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [20, 0], zoom: 2,
      zoomControl: false, attributionControl: false,
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

    L.control.zoom({ position: "bottomright" }).addTo(map);
    mapRef.current = map;

    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // ── Dark/light tiles ──────────────────────────────────────────
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

  // ── Country fills (GeoJSON) ───────────────────────────────────
  useEffect(() => {
    if (!countryLayerRef.current) return;
    countryLayerRef.current.clearLayers();

    const showCountryFills = filterMode === "all" || filterMode === "countries";
    if (!showCountryFills || visits.length === 0) return;

    const countryVisitCounts: Record<string, number> = {};
    visits.forEach(v => {
      if (v.country_code) {
        const code = v.country_code.toUpperCase();
        countryVisitCounts[code] = (countryVisitCounts[code] || 0) + 1;
      }
    });

    const visitedCodes = new Set(Object.keys(countryVisitCounts));
    const wishlistCodes = new Set(
      wishlist.map(w => w.country_code?.toUpperCase()).filter(Boolean) as string[]
    );

    fetchGeoJSON().then(geojson => {
      if (!countryLayerRef.current) return;

      // Visited countries — solid fill
      L.geoJSON(geojson, {
        filter: (f: any) => visitedCodes.has(f.properties?.["ISO3166-1-Alpha-2"]?.toUpperCase()),
        style: (f: any) => {
          const code = f?.properties?.["ISO3166-1-Alpha-2"]?.toUpperCase();
          const count = countryVisitCounts[code] || 1;
          const color = getVisitColor(count, colorScheme);
          return {
            fillColor: color,
            fillOpacity: 0.45,
            color: color,
            weight: 1.5,
            opacity: 0.7,
          };
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

      // Wishlist countries — dashed violet outline
      L.geoJSON(geojson, {
        filter: (f: any) => {
          const code = f.properties?.["ISO3166-1-Alpha-2"]?.toUpperCase();
          return wishlistCodes.has(code) && !visitedCodes.has(code);
        },
        style: () => ({
          fillColor: "#8b5cf6",
          fillOpacity: 0.12,
          color: "#8b5cf6",
          weight: 1.5,
          opacity: 0.5,
          dashArray: "5 5",
        }),
      }).addTo(countryLayerRef.current);

    }).catch(console.error);
  }, [visits, wishlist, filterMode, colorScheme]);

  // ── City / neighborhood markers ───────────────────────────────
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

    if (filterMode !== "wishlist") {
      visits.forEach(visit => {
        if (!visit.lat || !visit.lng) return;

        const type = visit.place_type;
        const isNeighborhood = type === "neighborhood";

        if (filterMode === "countries") return;
        if (filterMode === "cities" && isNeighborhood) return;
        if (filterMode === "neighborhoods" && !isNeighborhood) return;

        const coverPhoto = visit.visit_photos?.find(p => p.is_cover)?.url
                        || visit.visit_photos?.[0]?.url;
        const visitCount = countryVisitCounts[visit.country_code?.toUpperCase() || ""] || 1;
        const color = getVisitColor(visitCount, colorScheme);
        const size = isNeighborhood ? 8 : 12;

        const icon = L.divIcon({
          className: "",
          html: coverPhoto
            ? `<div style="width:38px;height:38px;border-radius:50%;overflow:hidden;
                border:2.5px solid ${color};
                box-shadow:0 0 0 3px ${color}50,0 4px 16px rgba(0,0,0,0.6)">
                <img src="${coverPhoto}" style="width:100%;height:100%;object-fit:cover"/>
              </div>`
            : `<div style="width:${size}px;height:${size}px;border-radius:50%;
                background:${color};
                border:2px solid rgba(255,255,255,0.5);
                box-shadow:0 0 0 3px ${color}45,0 0 14px ${color}70">
              </div>`,
          iconSize:   coverPhoto ? [38, 38] : [size, size],
          iconAnchor: coverPhoto ? [19, 19] : [size / 2, size / 2],
        });

        const marker = L.marker([visit.lat, visit.lng], { icon });
        marker.on("click", e => {
          L.DomEvent.stopPropagation(e);
          setSelectedVisit(visit);
        });

        const stars = visit.rating
          ? "★".repeat(visit.rating) + "☆".repeat(5 - visit.rating)
          : null;

        marker.bindTooltip(
          `<div style="min-width:130px">
            <div style="font-weight:700;font-size:13px;margin-bottom:3px">${visit.place_name}</div>
            ${visit.country_name ? `<div style="font-size:11px;opacity:0.65">${visit.country_name}</div>` : ""}
            ${visit.visited_at
              ? `<div style="font-size:11px;opacity:0.55;margin-top:4px">
                   ${new Date(visit.visited_at).toLocaleDateString("fr-FR", { year: "numeric", month: "short" })}
                 </div>`
              : ""}
            ${stars ? `<div style="font-size:12px;color:#f59e0b;margin-top:3px">${stars}</div>` : ""}
          </div>`,
          { className: "map-tooltip", direction: "top", offset: [0, -10] }
        );

        markersLayerRef.current!.addLayer(marker);
      });
    }

    // Wishlist markers
    if (filterMode === "all" || filterMode === "wishlist") {
      wishlist.forEach(item => {
        if (!item.lat || !item.lng) return;
        const pc = item.priority === "high" ? "#ef4444"
                 : item.priority === "low"  ? "#6b7280"
                 : "#8b5cf6";
        const icon = L.divIcon({
          className: "",
          html: `<div style="width:10px;height:10px;border-radius:50%;
            background:${pc};border:2px solid rgba(255,255,255,0.5);
            box-shadow:0 0 0 3px ${pc}40"></div>`,
          iconSize: [10, 10], iconAnchor: [5, 5],
        });
        const marker = L.marker([item.lat, item.lng], { icon });
        marker.bindTooltip(
          `<div style="min-width:120px">
            <div style="font-weight:700;font-size:13px">💜 ${item.place_name}</div>
            ${item.country_name ? `<div style="font-size:11px;opacity:0.65">${item.country_name}</div>` : ""}
          </div>`,
          { className: "map-tooltip", direction: "top", offset: [0, -10] }
        );
        markersLayerRef.current!.addLayer(marker);
      });
    }
  }, [visits, wishlist, filterMode, colorScheme]);

  useEffect(() => { renderMarkers(); }, [renderMarkers]);

  // ── Data refresh ──────────────────────────────────────────────
  const handleVisitAdded = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("visits").select("*, visit_photos(*)")
      .eq("user_id", userId).order("visited_at", { ascending: false });
    if (data) setVisits(data as typeof visits);
    toast.success("✈️ " + t.saveVisit);
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
      <div ref={mapContainerRef} className="absolute inset-0 z-0" />

      <MapControls
        filterMode={filterMode}   setFilterMode={setFilterMode}
        isDark={isDark}           setIsDark={setIsDark}
        visits={visits}           wishlist={wishlist}
        onFlyTo={flyToVisit}
        onAddVisit={() => { setAddCoords(null); setAddModalOpen(true); }}
        searchQuery={searchQuery} setSearchQuery={setSearchQuery}
      />

      {selectedVisit && (
        <VisitPanel
          visit={selectedVisit}
          onClose={() => setSelectedVisit(null)}
          onUpdated={handleVisitAdded}
          userId={userId}
        />
      )}

      {addModalOpen && (
        <AddVisitModal
          coords={addCoords} userId={userId}
          onClose={() => { setAddModalOpen(false); setAddCoords(null); }}
          onVisitAdded={handleVisitAdded}
          onWishlistAdded={handleWishlistAdded}
        />
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
    </div>
  );
}
