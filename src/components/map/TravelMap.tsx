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
}

function getCountryColor(visitCount: number, scheme: string = "emerald"): string {
  const schemes: Record<string, string[]> = {
    emerald: ["#d1fae5", "#6ee7b7", "#34d399", "#10b981", "#059669", "#047857"],
    sky: ["#e0f2fe", "#7dd3fc", "#38bdf8", "#0ea5e9", "#0284c7", "#0369a1"],
    violet: ["#ede9fe", "#c4b5fd", "#a78bfa", "#8b5cf6", "#7c3aed", "#6d28d9"],
    rose: ["#ffe4e6", "#fda4af", "#fb7185", "#f43f5e", "#e11d48", "#be123c"],
    amber: ["#fef3c7", "#fde68a", "#fcd34d", "#f59e0b", "#d97706", "#b45309"],
    teal: ["#ccfbf1", "#99f6e4", "#5eead4", "#2dd4bf", "#14b8a6", "#0d9488"],
  };
  const colors = schemes[scheme] || schemes.emerald;
  const idx = Math.min(visitCount - 1, colors.length - 1);
  return colors[idx];
}

export default function TravelMap({ visits: initialVisits, wishlist: initialWishlist, userId }: Props) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const [visits, setVisits] = useState(initialVisits);
  const [wishlist, setWishlist] = useState(initialWishlist);
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [isDark, setIsDark] = useState(true);
  const [selectedVisit, setSelectedVisit] = useState<(typeof visits)[0] | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addCoords, setAddCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [colorScheme] = useState("emerald");
  const { t } = useLocale();

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    const map = L.map(mapContainerRef.current, {
      center: [20, 0], zoom: 2, zoomControl: false, attributionControl: false,
    });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 19, subdomains: "abcd",
    }).addTo(map);
    mapRef.current = map;
    markersRef.current = L.layerGroup().addTo(map);
    map.on("click", e => {
      const { lat, lng } = e.latlng;
      setAddCoords({ lat, lng });
      setAddModalOpen(true);
    });
    L.control.zoom({ position: "bottomright" }).addTo(map);
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.eachLayer(layer => {
      if (layer instanceof L.TileLayer) mapRef.current!.removeLayer(layer);
    });
    const url = isDark
      ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
    L.tileLayer(url, { maxZoom: 19, subdomains: "abcd" }).addTo(mapRef.current);
  }, [isDark]);

  const renderMarkers = useCallback(() => {
    if (!markersRef.current) return;
    markersRef.current.clearLayers();

    const showCountries = filterMode === "all" || filterMode === "countries";
    const showCities = filterMode === "all" || filterMode === "cities";
    const showNeighborhoods = filterMode === "all" || filterMode === "neighborhoods";
    const showWishlist = filterMode === "all" || filterMode === "wishlist";

    const countryVisitCounts: Record<string, number> = {};
    visits.forEach(v => {
      if (v.country_code) countryVisitCounts[v.country_code] = (countryVisitCounts[v.country_code] || 0) + 1;
    });

    visits.forEach(visit => {
      if (!visit.lat || !visit.lng) return;
      const isCity = ["city", "landmark"].includes(visit.place_type);
      const isNeighborhood = visit.place_type === "neighborhood";
      const isCountry = visit.place_type === "country";

      if (isCountry && !showCountries) return;
      if (isCity && !showCities) return;
      if (isNeighborhood && !showNeighborhoods) return;

      const coverPhoto = visit.visit_photos?.find(p => p.is_cover)?.url || visit.visit_photos?.[0]?.url;
      const visitCount = countryVisitCounts[visit.country_code || ""] || 1;
      const color = getCountryColor(visitCount, colorScheme);
      const size = isCountry ? 10 : isNeighborhood ? 8 : 12;

      const icon = L.divIcon({
        className: "",
        html: coverPhoto
          ? `<div style="width:36px;height:36px;border-radius:50%;overflow:hidden;border:2px solid ${color};box-shadow:0 0 0 3px ${color}40,0 4px 15px rgba(0,0,0,0.5)">
              <img src="${coverPhoto}" style="width:100%;height:100%;object-fit:cover" />
            </div>`
          : `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid rgba(255,255,255,0.4);box-shadow:0 0 0 3px ${color}40,0 0 12px ${color}60"></div>`,
        iconSize: coverPhoto ? [36, 36] : [size, size],
        iconAnchor: coverPhoto ? [18, 18] : [size / 2, size / 2],
      });

      const marker = L.marker([visit.lat, visit.lng], { icon });
      marker.on("click", e => { L.DomEvent.stopPropagation(e); setSelectedVisit(visit); });

      const ratingStars = visit.rating ? "★".repeat(visit.rating) + "☆".repeat(5 - visit.rating) : null;
      marker.bindTooltip(
        `<div style="min-width:120px">
          <div style="font-weight:600;font-size:13px;margin-bottom:2px">${visit.place_name}</div>
          ${visit.country_name ? `<div style="font-size:11px;opacity:0.7">${visit.country_name}</div>` : ""}
          ${visit.visited_at ? `<div style="font-size:11px;opacity:0.6;margin-top:4px">${new Date(visit.visited_at).toLocaleDateString("fr-FR", { year: "numeric", month: "short" })}</div>` : ""}
          ${ratingStars ? `<div style="font-size:11px;color:#f59e0b;margin-top:2px">${ratingStars}</div>` : ""}
        </div>`,
        { className: "map-tooltip", direction: "top", offset: [0, -10] }
      );
      markersRef.current!.addLayer(marker);
    });

    if (showWishlist) {
      wishlist.forEach(item => {
        if (!item.lat || !item.lng) return;
        const priorityColor = item.priority === "high" ? "#ef4444" : item.priority === "low" ? "#6b7280" : "#8b5cf6";
        const icon = L.divIcon({
          className: "",
          html: `<div style="width:12px;height:12px;border-radius:50%;background:${priorityColor};border:2px solid rgba(255,255,255,0.4);box-shadow:0 0 0 3px ${priorityColor}40,0 0 12px ${priorityColor}50"></div>`,
          iconSize: [12, 12], iconAnchor: [6, 6],
        });
        const marker = L.marker([item.lat, item.lng], { icon });
        marker.bindTooltip(
          `<div style="min-width:120px">
            <div style="font-weight:600;font-size:13px;margin-bottom:2px">💜 ${item.place_name}</div>
            ${item.country_name ? `<div style="font-size:11px;opacity:0.7">${item.country_name}</div>` : ""}
            <div style="font-size:10px;margin-top:4px;padding:2px 6px;border-radius:20px;display:inline-block;background:${priorityColor}30;color:${priorityColor}">${item.priority}</div>
          </div>`,
          { className: "map-tooltip", direction: "top", offset: [0, -10] }
        );
        markersRef.current!.addLayer(marker);
      });
    }
  }, [visits, wishlist, filterMode, colorScheme]);

  useEffect(() => { renderMarkers(); }, [renderMarkers]);

  const handleVisitAdded = async () => {
    const supabase = createClient();
    const { data } = await supabase.from("visits").select("*, visit_photos(*)").eq("user_id", userId).order("visited_at", { ascending: false });
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
