"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Visit, WishlistItem } from "@/types/database";
import MapControls from "./MapControls";
import VisitPanel from "./VisitPanel";
import AddVisitModal from "./AddVisitModal";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";

interface Props {
  visits: (Visit & { visit_photos: { url: string; is_cover: boolean }[] })[];
  wishlist: WishlistItem[];
  userId: string;
}

type FilterMode = "all" | "visited" | "wishlist";

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

  // Init map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [20, 0],
      zoom: 2,
      zoomControl: false,
      attributionControl: false,
    });

    // Dark tile layer
    const darkTile = L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      { maxZoom: 19, subdomains: "abcd" }
    );

    const lightTile = L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
      { maxZoom: 19, subdomains: "abcd" }
    );

    darkTile.addTo(map);
    mapRef.current = map;

    // Layer group for markers
    const markers = L.layerGroup().addTo(map);
    markersRef.current = markers;

    // Click to add
    map.on("click", (e) => {
      const { lat, lng } = e.latlng;
      setAddCoords({ lat, lng });
      setAddModalOpen(true);
    });

    // Zoom controls
    L.control.zoom({ position: "bottomright" }).addTo(map);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update tile layer on dark mode toggle
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        mapRef.current!.removeLayer(layer);
      }
    });
    const url = isDark
      ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
    L.tileLayer(url, { maxZoom: 19, subdomains: "abcd" }).addTo(mapRef.current);
  }, [isDark]);

  // Render markers
  const renderMarkers = useCallback(() => {
    if (!markersRef.current) return;
    markersRef.current.clearLayers();

    if (filterMode === "all" || filterMode === "visited") {
      visits.forEach((visit) => {
        if (!visit.lat || !visit.lng) return;
        const coverPhoto = visit.visit_photos?.find((p) => p.is_cover)?.url || visit.visit_photos?.[0]?.url;

        const icon = L.divIcon({
          className: "",
          html: coverPhoto
            ? `<div style="width:36px;height:36px;border-radius:50%;overflow:hidden;border:2px solid #10b981;box-shadow:0 0 0 3px rgba(16,185,129,0.3),0 4px 15px rgba(0,0,0,0.5)">
                <img src="${coverPhoto}" style="width:100%;height:100%;object-fit:cover" />
              </div>`
            : `<div style="width:14px;height:14px;border-radius:50%;background:#10b981;border:2px solid rgba(255,255,255,0.4);box-shadow:0 0 0 4px rgba(16,185,129,0.25),0 0 15px rgba(16,185,129,0.3)"></div>`,
          iconSize: coverPhoto ? [36, 36] : [14, 14],
          iconAnchor: coverPhoto ? [18, 18] : [7, 7],
        });

        const marker = L.marker([visit.lat, visit.lng], { icon });
        marker.on("click", (e) => {
          L.DomEvent.stopPropagation(e);
          setSelectedVisit(visit);
        });

        const ratingStars = visit.rating
          ? "★".repeat(visit.rating) + "☆".repeat(5 - visit.rating)
          : null;

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
    }

    if (filterMode === "all" || filterMode === "wishlist") {
      wishlist.forEach((item) => {
        if (!item.lat || !item.lng) return;
        const priorityColor = item.priority === "high" ? "#ef4444" : item.priority === "low" ? "#6b7280" : "#8b5cf6";

        const icon = L.divIcon({
          className: "",
          html: `<div style="width:14px;height:14px;border-radius:50%;background:${priorityColor};border:2px solid rgba(255,255,255,0.4);box-shadow:0 0 0 4px ${priorityColor}40,0 0 15px ${priorityColor}50"></div>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        });

        const marker = L.marker([item.lat, item.lng], { icon });
        marker.bindTooltip(
          `<div style="min-width:120px">
            <div style="font-weight:600;font-size:13px;margin-bottom:2px">💜 ${item.place_name}</div>
            ${item.country_name ? `<div style="font-size:11px;opacity:0.7">${item.country_name}</div>` : ""}
            <div style="font-size:10px;margin-top:4px;padding:2px 6px;border-radius:20px;display:inline-block;background:${priorityColor}30;color:${priorityColor}">
              ${item.priority} priority
            </div>
          </div>`,
          { className: "map-tooltip", direction: "top", offset: [0, -10] }
        );
        markersRef.current!.addLayer(marker);
      });
    }
  }, [visits, wishlist, filterMode]);

  useEffect(() => { renderMarkers(); }, [renderMarkers]);

  const handleVisitAdded = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("visits")
      .select("*, visit_photos(*)")
      .eq("user_id", userId)
      .order("visited_at", { ascending: false });
    if (data) setVisits(data as typeof visits);
    toast.success("Visit added! ✈️");
  };

  const handleWishlistAdded = async () => {
    const supabase = createClient();
    const { data } = await supabase.from("wishlist").select("*").eq("user_id", userId);
    if (data) setWishlist(data);
    toast.success("Added to wishlist! 💜");
  };

  const flyToVisit = useCallback((lat: number, lng: number) => {
    mapRef.current?.flyTo([lat, lng], 8, { duration: 1.5 });
  }, []);

  return (
    <div className="relative w-full h-full bg-[var(--map-bg)]">
      {/* Map container */}
      <div ref={mapContainerRef} className="absolute inset-0 z-0" />

      {/* Controls overlay */}
      <MapControls
        filterMode={filterMode}
        setFilterMode={setFilterMode}
        isDark={isDark}
        setIsDark={setIsDark}
        visits={visits}
        wishlist={wishlist}
        onFlyTo={flyToVisit}
        onAddVisit={() => { setAddCoords(null); setAddModalOpen(true); }}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      {/* Visit detail panel */}
      {selectedVisit && (
        <VisitPanel
          visit={selectedVisit}
          onClose={() => setSelectedVisit(null)}
          onUpdated={handleVisitAdded}
          userId={userId}
        />
      )}

      {/* Add visit modal */}
      {addModalOpen && (
        <AddVisitModal
          coords={addCoords}
          userId={userId}
          onClose={() => { setAddModalOpen(false); setAddCoords(null); }}
          onVisitAdded={handleVisitAdded}
          onWishlistAdded={handleWishlistAdded}
        />
      )}

      {/* Legend */}
      <div className="absolute bottom-10 left-4 z-10 glass rounded-xl px-3 py-2 flex items-center gap-4 text-xs text-[var(--text-secondary)]">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
          <span>Visited ({visits.length})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-violet-500 shadow-[0_0_6px_rgba(139,92,246,0.5)]" />
          <span>Wishlist ({wishlist.length})</span>
        </div>
      </div>
    </div>
  );
}
