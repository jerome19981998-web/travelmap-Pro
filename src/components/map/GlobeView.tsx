"use client";

import { useEffect, useRef } from "react";
import type { Visit, WishlistItem } from "@/types/database";

interface Props {
  visits: (Visit & { visit_photos: { url: string; is_cover: boolean }[] })[];
  wishlist: WishlistItem[];
  colorScheme: string;
  isDark: boolean;
  filterMode: string;
  onVisitClick: (visit: Visit & { visit_photos: { url: string; is_cover: boolean }[] }) => void;
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

export default function GlobeView({ visits, wishlist, colorScheme, isDark, filterMode, onVisitClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const countryVisitCounts: Record<string, number> = {};
    visits.forEach(v => {
      if (v.country_code) {
        const code = v.country_code.toUpperCase();
        countryVisitCounts[code] = (countryVisitCounts[code] || 0) + 1;
      }
    });

    // Build points data
    const showWishlist = filterMode === "all" || filterMode === "wishlist";
    const visitPoints = filterMode !== "wishlist" ? visits
      .filter(v => {
        if (!v.lat || !v.lng) return false;
        const type = v.place_type;
        if (filterMode === "countries") return false;
        if (filterMode === "cities" && type === "neighborhood") return false;
        if (filterMode === "neighborhoods" && type !== "neighborhood") return false;
        return true;
      })
      .map(v => ({
        lat: v.lat!,
        lng: v.lng!,
        size: 0.4,
        color: getVisitColor(countryVisitCounts[v.country_code?.toUpperCase() || ""] || 1, colorScheme),
        label: v.place_name,
        visit: v,
      })) : [];

    const wishlistPoints = showWishlist ? wishlist
      .filter(w => w.lat && w.lng)
      .map(w => ({
        lat: w.lat!,
        lng: w.lng!,
        size: 0.3,
        color: w.priority === "high" ? "#ef4444" : w.priority === "low" ? "#6b7280" : "#8b5cf6",
        label: w.place_name,
        visit: null,
      })) : [];

    const allPoints = [...visitPoints, ...wishlistPoints];

    // Load globe.gl dynamically
    import("globe.gl").then(({ default: Globe }) => {
      if (!containerRef.current) return;

      // Clear previous
      if (globeRef.current) {
        containerRef.current.innerHTML = "";
      }

      const globe = Globe()(containerRef.current!)
        .globeImageUrl(isDark
          ? "//unpkg.com/three-globe/example/img/earth-night.jpg"
          : "//unpkg.com/three-globe/example/img/earth-day.jpg"
        )
        .backgroundImageUrl(isDark
          ? "//unpkg.com/three-globe/example/img/night-sky.png"
          : null
        )
        .pointsData(allPoints)
        .pointAltitude("size")
        .pointColor("color")
        .pointRadius(0.4)
        .pointLabel("label")
        .onPointClick((point: any) => {
          if (point.visit) onVisitClick(point.visit);
        })
        .width(containerRef.current!.offsetWidth)
        .height(containerRef.current!.offsetHeight);

      globeRef.current = globe;
    }).catch(console.error);

    return () => {
      if (globeRef.current && containerRef.current) {
        containerRef.current.innerHTML = "";
        globeRef.current = null;
      }
    };
  }, [visits, wishlist, colorScheme, isDark, filterMode, onVisitClick]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ background: isDark ? "#050a14" : "#f0f9ff" }}
    />
  );
}
