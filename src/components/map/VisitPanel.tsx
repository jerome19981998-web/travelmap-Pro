"use client";

import { useState } from "react";
import { X, Star, Calendar, MapPin, Edit2, Trash2, Camera } from "lucide-react";
import type { Visit, VisitPhoto } from "@/types/database";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { format } from "date-fns";

type VisitWithPhotos = Visit & { visit_photos: VisitPhoto[] };

interface Props {
  visit: VisitWithPhotos;
  onClose: () => void;
  onUpdated: () => void;
  userId: string;
}

export default function VisitPanel({ visit, onClose, onUpdated, userId }: Props) {
  const [editing, setEditing] = useState(false);
  const [notes, setNotes] = useState(visit.notes || "");
  const [rating, setRating] = useState(visit.rating || 0);
  const [uploading, setUploading] = useState(false);

  const handleSave = async () => {
    const supabase = createClient();
    const { error } = await supabase
      .from("visits")
      .update({ notes, rating: rating || null })
      .eq("id", visit.id);
    if (error) toast.error("Failed to save");
    else { toast.success("Saved!"); setEditing(false); onUpdated(); }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this visit?")) return;
    const supabase = createClient();
    await supabase.from("visits").delete().eq("id", visit.id);
    toast.success("Visit deleted");
    onClose();
    onUpdated();
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const supabase = createClient();
    const path = `${userId}/${visit.id}/${Date.now()}-${file.name}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("visit-photos")
      .upload(path, file);
    if (uploadError) { toast.error("Upload failed"); setUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from("visit-photos").getPublicUrl(path);
    const isFirst = visit.visit_photos.length === 0;
    await supabase.from("visit_photos").insert({
      visit_id: visit.id,
      user_id: userId,
      url: publicUrl,
      is_cover: isFirst,
    });
    if (isFirst) {
      await supabase.from("visits").update({ cover_photo_url: publicUrl }).eq("id", visit.id);
    }
    setUploading(false);
    toast.success("Photo uploaded!");
    onUpdated();
  };

  const continentFlag: Record<string, string> = {
    Europe: "🇪🇺", Asia: "🌏", Americas: "🌎", Africa: "🌍",
    Oceania: "🌊", Antarctica: "🧊",
  };

  return (
    <div className="absolute right-0 top-0 bottom-0 z-20 w-full max-w-sm glass-elevated border-l border-[var(--surface-border)] flex flex-col shadow-2xl animate-slide-up">
      {/* Header */}
      <div className="flex items-start justify-between p-5 border-b border-[var(--surface-border)]">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{continentFlag[visit.continent || ""] || "📍"}</span>
            <h2 className="font-bold text-[var(--text-primary)] truncate">{visit.place_name}</h2>
          </div>
          {visit.country_name && (
            <p className="text-sm text-[var(--text-secondary)]">{visit.country_name}</p>
          )}
        </div>
        <div className="flex items-center gap-2 ml-3">
          <button
            onClick={() => setEditing(!editing)}
            className="p-1.5 rounded-lg hover:bg-white/5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleDelete}
            className="p-1.5 rounded-lg hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-400 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Photos */}
        <div className="p-4">
          {visit.visit_photos.length > 0 ? (
            <div className="grid grid-cols-2 gap-2 mb-4">
              {visit.visit_photos.slice(0, 4).map((photo) => (
                <div key={photo.id} className="aspect-square rounded-xl overflow-hidden relative">
                  <Image src={photo.url} alt="" fill className="object-cover" />
                  {photo.is_cover && (
                    <div className="absolute top-1 left-1 bg-black/50 rounded px-1.5 py-0.5 text-[10px] text-white">Cover</div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="aspect-video rounded-xl bg-white/5 flex flex-col items-center justify-center gap-2 mb-4 border border-dashed border-[var(--surface-border)]">
              <Camera className="w-8 h-8 text-[var(--text-muted)]" />
              <p className="text-xs text-[var(--text-muted)]">No photos yet</p>
            </div>
          )}

          <label className="flex items-center justify-center gap-2 w-full py-2 rounded-xl border border-dashed border-[var(--surface-border)] hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-colors cursor-pointer text-sm text-[var(--text-muted)] hover:text-emerald-400">
            <Camera className="w-4 h-4" />
            {uploading ? "Uploading..." : "Add photo"}
            <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" disabled={uploading} />
          </label>
        </div>

        {/* Details */}
        <div className="px-4 space-y-4">
          {/* Date */}
          {visit.visited_at && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-[var(--text-muted)]" />
              <span className="text-[var(--text-secondary)]">
                {format(new Date(visit.visited_at), "MMMM d, yyyy")}
                {visit.departed_at && ` → ${format(new Date(visit.departed_at), "MMMM d, yyyy")}`}
              </span>
            </div>
          )}

          {/* Coordinates */}
          {visit.lat && visit.lng && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-[var(--text-muted)]" />
              <span className="text-[var(--text-muted)] font-mono text-xs">
                {visit.lat.toFixed(4)}, {visit.lng.toFixed(4)}
              </span>
            </div>
          )}

          {/* Rating */}
          <div>
            <div className="text-xs text-[var(--text-muted)] mb-2">Rating</div>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => { if (editing) setRating(star === rating ? 0 : star); }}
                  className={`text-xl transition-transform ${editing ? "hover:scale-125 cursor-pointer" : "cursor-default"}`}
                >
                  {star <= rating ? "⭐" : "☆"}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <div className="text-xs text-[var(--text-muted)] mb-2">Notes</div>
            {editing ? (
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="Write about your experience..."
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-[var(--surface-border)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-emerald-500/50 resize-none"
              />
            ) : (
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                {notes || <span className="text-[var(--text-muted)] italic">No notes yet. Click edit to add some.</span>}
              </p>
            )}
          </div>

          {/* Quick memory badge */}
          {visit.is_quick_memory && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400">
              ⚡ Quick memory — tap edit to add full details
            </div>
          )}
        </div>
      </div>

      {/* Save button */}
      {editing && (
        <div className="p-4 border-t border-[var(--surface-border)] flex gap-2">
          <button
            onClick={() => setEditing(false)}
            className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-sm text-[var(--text-secondary)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold transition-colors"
          >
            Save changes
          </button>
        </div>
      )}
    </div>
  );
}
