"use client";

import { useState } from "react";
import type { SharedMap } from "@/types/database";
import { Share2, Link, Copy, Trash2, Plus, Eye, ToggleLeft, ToggleRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";

interface Props {
  sharedMaps: SharedMap[];
  userId: string;
}

export default function ShareClient({ sharedMaps: initial, userId }: Props) {
  const [maps, setMaps] = useState(initial);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [showStats, setShowStats] = useState(true);
  const [showBadges, setShowBadges] = useState(true);
  const [saving, setSaving] = useState(false);

  const appUrl = typeof window !== "undefined" ? window.location.origin : "";

  const createShare = async () => {
    if (!title.trim()) { toast.error("Add a title"); return; }
    setSaving(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("shared_maps")
      .insert({ user_id: userId, title, description: description || null, show_stats: showStats, show_badges: showBadges })
      .select()
      .single();
    if (error) toast.error(error.message);
    else {
      setMaps(prev => [data, ...prev]);
      setCreating(false);
      setTitle("");
      setDescription("");
      toast.success("Share link created!");
    }
    setSaving(false);
  };

  const copyLink = (token: string) => {
    navigator.clipboard.writeText(`${appUrl}/map/${token}`);
    toast.success("Link copied!");
  };

  const toggleActive = async (id: string, current: boolean) => {
    const supabase = createClient();
    await supabase.from("shared_maps").update({ is_active: !current }).eq("id", id);
    setMaps(prev => prev.map(m => m.id === id ? { ...m, is_active: !current } : m));
  };

  const deleteShare = async (id: string) => {
    if (!confirm("Delete this share link?")) return;
    const supabase = createClient();
    await supabase.from("shared_maps").delete().eq("id", id);
    setMaps(prev => prev.filter(m => m.id !== id));
    toast.success("Share deleted");
  };

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Share2 className="w-6 h-6 text-sky-400" />
            Share your map
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Create shareable links to your travel map</p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-sm font-semibold transition-colors"
        >
          <Plus className="w-4 h-4" />
          New share
        </button>
      </div>

      {/* Create form */}
      {creating && (
        <div className="glass rounded-2xl p-5 mb-6 border border-sky-500/20">
          <h2 className="font-semibold text-[var(--text-primary)] mb-4">New share link</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1.5">Title *</label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="My travel map 2025"
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-[var(--surface-border)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-sky-500/50" />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1.5">Description</label>
              <input value={description} onChange={e => setDescription(e.target.value)} placeholder="My adventures around the world"
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-[var(--surface-border)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-sky-500/50" />
            </div>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <button onClick={() => setShowStats(!showStats)}>
                  {showStats ? <ToggleRight className="w-5 h-5 text-sky-400" /> : <ToggleLeft className="w-5 h-5 text-[var(--text-muted)]" />}
                </button>
                <span className="text-sm text-[var(--text-secondary)]">Show stats</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <button onClick={() => setShowBadges(!showBadges)}>
                  {showBadges ? <ToggleRight className="w-5 h-5 text-sky-400" /> : <ToggleLeft className="w-5 h-5 text-[var(--text-muted)]" />}
                </button>
                <span className="text-sm text-[var(--text-secondary)]">Show badges</span>
              </label>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setCreating(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/5 text-sm text-[var(--text-secondary)] hover:bg-white/10 transition-colors">
                Cancel
              </button>
              <button onClick={createShare} disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-sm font-semibold transition-colors disabled:opacity-50">
                {saving ? "Creating..." : "Create link"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Existing shares */}
      {maps.length === 0 && !creating ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Share2 className="w-12 h-12 text-[var(--text-muted)]" />
          <p className="text-[var(--text-secondary)]">No share links yet</p>
          <p className="text-sm text-[var(--text-muted)]">Create a link to share your travel map with friends</p>
        </div>
      ) : (
        <div className="space-y-3">
          {maps.map((map) => (
            <div key={map.id} className="glass rounded-2xl p-5 border border-[var(--surface-border)] hover:border-sky-500/20 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-[var(--text-primary)]">{map.title}</h3>
                  {map.description && <p className="text-xs text-[var(--text-secondary)] mt-0.5">{map.description}</p>}
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button onClick={() => toggleActive(map.id, map.is_active)}
                    title={map.is_active ? "Deactivate" : "Activate"}>
                    {map.is_active
                      ? <ToggleRight className="w-5 h-5 text-sky-400" />
                      : <ToggleLeft className="w-5 h-5 text-[var(--text-muted)]" />}
                  </button>
                  <button onClick={() => deleteShare(map.id)}
                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-400 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 text-xs text-[var(--text-muted)] font-mono truncate">
                  <Link className="w-3 h-3 flex-shrink-0" />
                  {appUrl}/map/{map.share_token}
                </div>
                <button
                  onClick={() => copyLink(map.share_token)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sky-500/20 text-sky-300 border border-sky-500/30 text-xs font-medium hover:bg-sky-500/30 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy
                </button>
              </div>

              <div className="flex items-center gap-4 mt-3 text-xs text-[var(--text-muted)]">
                <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {map.view_count} views</span>
                <span>{map.show_stats ? "✓ Stats" : "✗ Stats"}</span>
                <span>{map.show_badges ? "✓ Badges" : "✗ Badges"}</span>
                <span className={map.is_active ? "text-emerald-400" : "text-red-400"}>
                  {map.is_active ? "● Active" : "● Inactive"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
