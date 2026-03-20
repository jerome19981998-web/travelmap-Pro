"use client";

import { useState } from "react";
import type { WishlistItem } from "@/types/database";
import { Heart, Trash2, MapPin, Calendar, Flag, ArrowUpDown, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import AddVisitModal from "@/components/map/AddVisitModal";
import { clsx } from "clsx";

interface Props {
  wishlist: WishlistItem[];
  userId: string;
}

const PRIORITY_CONFIG = {
  high: { label: "High", color: "text-red-400", bg: "bg-red-500/10 border-red-500/20", dot: "bg-red-400" },
  medium: { label: "Medium", color: "text-violet-400", bg: "bg-violet-500/10 border-violet-500/20", dot: "bg-violet-400" },
  low: { label: "Low", color: "text-gray-400", bg: "bg-gray-500/10 border-gray-500/20", dot: "bg-gray-400" },
};

export default function WishlistClient({ wishlist: initial, userId }: Props) {
  const [items, setItems] = useState(initial);
  const [filter, setFilter] = useState<"all" | "high" | "medium" | "low">("all");
  const [sortBy, setSortBy] = useState<"priority" | "recent" | "year">("priority");
  const [addModalOpen, setAddModalOpen] = useState(false);

  const filtered = items
    .filter(i => filter === "all" || i.priority === filter)
    .sort((a, b) => {
      if (sortBy === "priority") {
        const order = { high: 0, medium: 1, low: 2 };
        return order[a.priority] - order[b.priority];
      }
      if (sortBy === "year") return (a.target_year || 9999) - (b.target_year || 9999);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const handleDelete = async (id: string) => {
    const supabase = createClient();
    await supabase.from("wishlist").delete().eq("id", id);
    setItems(prev => prev.filter(i => i.id !== id));
    toast.success("Removed from wishlist");
  };

  const handlePriorityChange = async (id: string, priority: "high" | "medium" | "low") => {
    const supabase = createClient();
    await supabase.from("wishlist").update({ priority }).eq("id", id);
    setItems(prev => prev.map(i => i.id === id ? { ...i, priority } : i));
  };

  const handleAdded = async () => {
    const supabase = createClient();
    const { data } = await supabase.from("wishlist").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    if (data) setItems(data);
  };

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Heart className="w-6 h-6 text-violet-400" />
            Wishlist
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">{items.length} places to explore</p>
        </div>
        <button
          onClick={() => setAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-500 hover:bg-violet-400 text-white text-sm font-semibold transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add place
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex rounded-xl overflow-hidden border border-[var(--surface-border)]">
          {(["all", "high", "medium", "low"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={clsx(
                "px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                filter === f
                  ? f === "high" ? "bg-red-500/20 text-red-300"
                  : f === "medium" ? "bg-violet-500/20 text-violet-300"
                  : f === "low" ? "bg-gray-500/20 text-gray-300"
                  : "bg-white/10 text-[var(--text-primary)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              )}
            >
              {f === "all" ? "All" : f === "high" ? "🔴 High" : f === "medium" ? "🟣 Medium" : "⚪ Low"}
            </button>
          ))}
        </div>

        <button
          onClick={() => setSortBy(s => s === "priority" ? "recent" : s === "recent" ? "year" : "priority")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ArrowUpDown className="w-3.5 h-3.5" />
          Sort: {sortBy}
        </button>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Heart className="w-12 h-12 text-[var(--text-muted)]" />
          <p className="text-[var(--text-secondary)]">No wishlist items yet</p>
          <button onClick={() => setAddModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-violet-500 text-white text-sm hover:bg-violet-400 transition-colors">
            Add your first dream destination
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => {
            const cfg = PRIORITY_CONFIG[item.priority];
            return (
              <div key={item.id} className="glass rounded-2xl p-5 group hover:border-violet-500/20 transition-all duration-200 border border-transparent">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-[var(--text-primary)] truncate">{item.place_name}</h3>
                    {item.country_name && (
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5">{item.country_name}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-400 transition-all ml-2"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Priority badge */}
                <div className="flex items-center gap-2 mb-3">
                  <span className={clsx("flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border", cfg.bg, cfg.color)}>
                    <span className={clsx("w-1.5 h-1.5 rounded-full", cfg.dot)} />
                    {cfg.label} priority
                  </span>
                </div>

                {/* Meta */}
                <div className="space-y-1.5">
                  {item.continent && (
                    <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                      <MapPin className="w-3 h-3" />
                      {item.continent}
                    </div>
                  )}
                  {item.target_year && (
                    <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                      <Calendar className="w-3 h-3" />
                      Target: {item.target_year}
                    </div>
                  )}
                </div>

                {item.notes && (
                  <p className="text-xs text-[var(--text-secondary)] mt-3 line-clamp-2 italic">&quot;{item.notes}&quot;</p>
                )}

                {/* Change priority */}
                <div className="flex gap-1 mt-4 pt-3 border-t border-[var(--surface-border)]">
                  {(["high", "medium", "low"] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => handlePriorityChange(item.id, p)}
                      className={clsx(
                        "flex-1 py-1 rounded-lg text-xs capitalize transition-colors",
                        item.priority === p ? PRIORITY_CONFIG[p].bg + " " + PRIORITY_CONFIG[p].color : "text-[var(--text-muted)] hover:bg-white/5"
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {addModalOpen && (
        <AddVisitModal
          coords={null}
          userId={userId}
          onClose={() => setAddModalOpen(false)}
          onVisitAdded={handleAdded}
          onWishlistAdded={handleAdded}
        />
      )}
    </div>
  );
}
