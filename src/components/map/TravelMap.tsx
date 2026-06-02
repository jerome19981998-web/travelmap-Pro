"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Visit, VisitPhoto, WishlistItem } from "@/types/database";
import MapControls, { type FilterMode } from "./MapControls";
import VisitPanel from "./VisitPanel";
import AddVisitModal from "./AddVisitModal";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { useLocale } from "@/hooks/useLocale";
import { Globe, Map } from "lucide-react";
import GlobeView from "./GlobeView";

interface Props {
  visits: (Visit & { visit_photos: VisitPhoto[] })[];
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

function escapeHtml(value: string | null | undefined): string {
  return (value || "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[char] || char));
}

function getValidCoords(lat: number | null, lng: number | null): [number, number] | null {
  return Number.isFinite(lat) && Number.isFinite(lng) ? [lat as number, lng as number] : null;
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
  center: [20, 0],
  zoom: 2,
  minZoom: 2,
  maxZoom: 19,
  zoomControl: false,
  attributionControl: false,
  maxBounds: [[-90, -180], [90, 180]],
  maxBoundsViscosity: 1.0,
  worldCopyJump: false,
});
