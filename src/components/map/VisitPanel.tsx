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
    const { error } = await supabase.from("visits").update({ notes, rating: rating || null }).eq("id", visit.id);
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
    const { error: uploadError } = await supabase.storage.from("visit-photos").upload(path, file);
    if (uploadError) { toast.error("Upload failed"); setUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from("visit-photos").getPublicUrl(path);
    const isFirst = visit.visit_photos.length === 0;
    await supabase.from("visit_photos").insert({ visit_id: visit.id, user_id: userId, url: publicUrl, is_cover: isFirst });
    if (isFirst) await supabase.from("visits").update({ cover_photo_url: publicUrl }).eq("id", visit.id);
    setUploading(false);
    toast.success("Photo uploaded!");
    onUpdated();
  };

  return (
    <>
      {/* Backdrop */}
      <div className="absolute inset-0 z-20 bg-black/40 lg:bg-transparent" onClick={onClose} />

      {/* Panel — bottom sheet on mobile, side panel on desktop */}
      <div className="
        absolute z-30
        bottom-0 left-0 right-0
        lg:bottom-0 lg:top-0 lg:left-auto lg:right-0 lg:w-80
        glass-elevated border-t lg:border-t-0 lg:border-l border-[var(--surface-border)]
        rounded-t-2xl lg:rounded-none
        flex flex-col
        max-h-[75vh] lg:max-h-full
        shadow-2xl
        animate-slide-up
      ">
        {/* Drag handle (mobile) */}
        <div className="flex justify-center pt-3 pb-1 lg:hidden">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between px-5 py-3 border-b border-[var(--surface-border)]">
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-[var(--text-primary)] truncate">{visit.place_name}</h2>
            {visit.country_name && <p className="text-sm text-[var(--text-secondary)]">{visit.country_name}</p>}
          </div>
          <div className="flex items-center gap-2 ml-3">
            <button onClick={() => setEditing(!editing)} className="p-1.5 rounded-lg hover:bg-white/5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
              <Edit2 className="w-4 h-4" />
            </button>
            <button onClick={handleDelete} className="p-1.5 rounded-lg hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-400 transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Photos */}
          {visit.visit_photos.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {visit.visit_photos.slice(0, 3).map(photo => (
                <div key={photo.id} className="aspect-square rounded-xl overflow-hidden relative">
                  <Image src={photo.url} alt="" fill className="object-cover" />
                </div>
              ))}
            </div>
          ) : null}

          <label className="flex items-center justify-center gap-2 w-full py-2 rounded-xl border border-dashed border-[var(--surface-border)] hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-colors cursor-pointer text-sm text-[var(--text-muted)] hover:text-emerald-400">
            <Camera className="w-4 h-4" />
            {uploading ? "Uploading..." : "Add photo"}
            <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" disabled={uploading} />
          </label>

          {/* Date */}
          {visit.visited_at && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-[var(--text-muted)]" />
              <span className="text-[var(--text-secondary)]">{format(new Date(visit.visited_at), "MMMM d, yyyy")}</span>
            </div>
          )}

          {/* Rating */}
          <div>
            <div className="text-xs text-[var(--text-muted)] mb-2">Rating</div>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(star => (
                <button key={star} onClick={() => { if (editing) setRating(star === rating ? 0 : star); }}
                  className={`text-xl transition-transform ${editing ? "hover:scale-125 cursor-pointer" : "cursor-default"}`}>
                  {star <= rating ? "⭐" : "☆"}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <div className="text-xs text-[var(--text-muted)] mb-2">Notes</div>
            {editing ? (
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                placeholder="Write about your experience..."
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-[var(--surface-border)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-emerald-500/50 resize-none" />
            ) : (
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                {notes || <span className="text-[var(--text-muted)] italic">No notes yet.</span>}
              </p>
            )}
          </div>
        </div>

        {/* Save button */}
        {editing && (
          <div className="p-4 border-t border-[var(--surface-border)] flex gap-2 pb-safe">
            <button onClick={() => setEditing(false)} className="flex-1 py-2.5 rounded-xl bg-white/5 text-sm text-[var(--text-secondary)]">Cancel</button>
            <button onClick={handleSave} className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold">Save</button>
          </div>
        )}
      </div>
    </>
  );
}
