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
    suburb?: string;
    quarter?: string;
    neighbourhood?: string;
    neighborhood?: string;
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
