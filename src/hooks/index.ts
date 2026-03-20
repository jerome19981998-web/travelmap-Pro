import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Visit, WishlistItem, UserStats, UserBadge, BadgeDefinition } from "@/types/database";

// Hook: current user's visits
export function useVisits(userId: string) {
  const [visits, setVisits] = useState<(Visit & { visit_photos: { url: string; is_cover: boolean }[] })[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("visits")
      .select("*, visit_photos(*)")
      .eq("user_id", userId)
      .order("visited_at", { ascending: false });
    setVisits((data as typeof visits) || []);
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { visits, loading, refetch: fetch };
}

// Hook: current user's wishlist
export function useWishlist(userId: string) {
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase.from("wishlist").select("*").eq("user_id", userId);
    setWishlist(data || []);
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { wishlist, loading, refetch: fetch };
}

// Hook: user stats
export function useStats(userId: string) {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.from("user_stats").select("*").eq("user_id", userId).single().then(({ data }) => {
      setStats(data);
      setLoading(false);
    });
  }, [userId]);

  return { stats, loading };
}

// Hook: badges
export function useBadges(userId: string) {
  const [earned, setEarned] = useState<(UserBadge & { badge_definitions: BadgeDefinition })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("user_badges")
      .select("*, badge_definitions(*)")
      .eq("user_id", userId)
      .then(({ data }) => {
        setEarned((data as typeof earned) || []);
        setLoading(false);
      });
  }, [userId]);

  return { earned, loading };
}

// Hook: real-time visits subscription
export function useRealtimeVisits(userId: string, onUpdate: () => void) {
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("visits-changes")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "visits",
        filter: `user_id=eq.${userId}`,
      }, onUpdate)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId, onUpdate]);
}

// Hook: debounce
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// Hook: local storage with SSR safety
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") return initialValue;
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const set = useCallback((v: T | ((prev: T) => T)) => {
    setValue((prev) => {
      const next = typeof v === "function" ? (v as (prev: T) => T)(prev) : v;
      if (typeof window !== "undefined") {
        window.localStorage.setItem(key, JSON.stringify(next));
      }
      return next;
    });
  }, [key]);

  return [value, set] as const;
}
