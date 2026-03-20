"use client";

import dynamic from "next/dynamic";
import type { Visit, WishlistItem } from "@/types/database";

const TravelMap = dynamic(() => import("./TravelMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[var(--map-bg)]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
        <p className="text-sm text-[var(--text-secondary)]">Loading map...</p>
      </div>
    </div>
  ),
});

interface Props {
  visits: (Visit & { visit_photos: { url: string; is_cover: boolean }[] })[];
  wishlist: WishlistItem[];
  userId: string;
}

export default function MapWrapper({ visits, wishlist, userId }: Props) {
  return <TravelMap visits={visits} wishlist={wishlist} userId={userId} />;
}
