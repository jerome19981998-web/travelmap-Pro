import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Visit, WishlistItem, UserStats } from "@/types/database";

interface AppState {
  // UI
  isDarkMode: boolean;
  sidebarCollapsed: boolean;
  toggleDarkMode: () => void;
  toggleSidebar: () => void;

  // Map
  mapFilter: "all" | "visited" | "wishlist";
  setMapFilter: (f: "all" | "visited" | "wishlist") => void;
  selectedVisitId: string | null;
  setSelectedVisitId: (id: string | null) => void;

  // Data cache
  visits: Visit[];
  wishlist: WishlistItem[];
  stats: UserStats | null;
  setVisits: (v: Visit[]) => void;
  setWishlist: (w: WishlistItem[]) => void;
  setStats: (s: UserStats | null) => void;
  addVisit: (v: Visit) => void;
  removeVisit: (id: string) => void;
  addWishlistItem: (w: WishlistItem) => void;
  removeWishlistItem: (id: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // UI defaults
      isDarkMode: true,
      sidebarCollapsed: false,
      toggleDarkMode: () => set((s) => ({ isDarkMode: !s.isDarkMode })),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

      // Map
      mapFilter: "all",
      setMapFilter: (f) => set({ mapFilter: f }),
      selectedVisitId: null,
      setSelectedVisitId: (id) => set({ selectedVisitId: id }),

      // Data
      visits: [],
      wishlist: [],
      stats: null,
      setVisits: (visits) => set({ visits }),
      setWishlist: (wishlist) => set({ wishlist }),
      setStats: (stats) => set({ stats }),
      addVisit: (v) => set((s) => ({ visits: [v, ...s.visits] })),
      removeVisit: (id) => set((s) => ({ visits: s.visits.filter((v) => v.id !== id) })),
      addWishlistItem: (w) => set((s) => ({ wishlist: [w, ...s.wishlist] })),
      removeWishlistItem: (id) => set((s) => ({ wishlist: s.wishlist.filter((w) => w.id !== id) })),
    }),
    {
      name: "travelmap-app-state",
      partialize: (state) => ({
        isDarkMode: state.isDarkMode,
        mapFilter: state.mapFilter,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
);
