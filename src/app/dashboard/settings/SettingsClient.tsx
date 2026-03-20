"use client";

import { useState } from "react";
import type { Profile } from "@/types/database";
import { Settings, User, Globe, Palette, Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";

interface Props {
  profile: Profile | null;
  userId: string;
  email: string;
}

export default function SettingsClient({ profile, userId, email }: Props) {
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [username, setUsername] = useState(profile?.username || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [homeCountry, setHomeCountry] = useState(profile?.home_country || "");
  const [isPublic, setIsPublic] = useState(profile?.is_public || false);
  const [colorScheme, setColorScheme] = useState(profile?.color_scheme || "emerald");
  const [saving, setSaving] = useState(false);

  const colorOptions = [
    { value: "emerald", label: "Emerald", bg: "bg-emerald-500" },
    { value: "sky", label: "Ocean", bg: "bg-sky-500" },
    { value: "violet", label: "Violet", bg: "bg-violet-500" },
    { value: "rose", label: "Rose", bg: "bg-rose-500" },
    { value: "amber", label: "Amber", bg: "bg-amber-500" },
    { value: "teal", label: "Teal", bg: "bg-teal-500" },
  ];

  const handleSave = async () => {
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("profiles").update({
      full_name: fullName || null,
      username: username || null,
      bio: bio || null,
      home_country: homeCountry || null,
      is_public: isPublic,
      color_scheme: colorScheme,
    }).eq("id", userId);

    if (error) toast.error(error.message);
    else toast.success("Settings saved!");
    setSaving(false);
  };

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
          <Settings className="w-6 h-6 text-[var(--text-secondary)]" />
          Settings
        </h1>
      </div>

      <div className="space-y-6">
        {/* Profile */}
        <div className="glass rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2 mb-4">
            <User className="w-4 h-4" /> Profile
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1.5">Email</label>
              <input value={email} disabled
                className="w-full px-4 py-2.5 rounded-xl bg-white/3 border border-[var(--surface-border)] text-sm text-[var(--text-muted)] cursor-not-allowed" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1.5">Full name</label>
                <input value={fullName} onChange={e => setFullName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-[var(--surface-border)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-emerald-500/50" />
              </div>
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1.5">Username</label>
                <input value={username} onChange={e => setUsername(e.target.value)} placeholder="@username"
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-[var(--surface-border)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-emerald-500/50" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1.5">Bio</label>
              <textarea value={bio} onChange={e => setBio(e.target.value)} rows={2}
                placeholder="World explorer, coffee lover..."
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-[var(--surface-border)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-emerald-500/50 resize-none" />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1.5">Home country</label>
              <input value={homeCountry} onChange={e => setHomeCountry(e.target.value)} placeholder="France"
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-[var(--surface-border)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-emerald-500/50" />
            </div>
          </div>
        </div>

        {/* Privacy */}
        <div className="glass rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2 mb-4">
            {isPublic ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            Privacy
          </h2>
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <div className="text-sm text-[var(--text-primary)]">Public profile</div>
              <div className="text-xs text-[var(--text-muted)] mt-0.5">Allow others to find and view your profile</div>
            </div>
            <button
              onClick={() => setIsPublic(!isPublic)}
              className={`relative w-11 h-6 rounded-full transition-colors ${isPublic ? "bg-emerald-500" : "bg-white/10"}`}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${isPublic ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </label>
        </div>

        {/* Appearance */}
        <div className="glass rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2 mb-4">
            <Palette className="w-4 h-4" /> Color scheme
          </h2>
          <div className="flex flex-wrap gap-3">
            {colorOptions.map(({ value, label, bg }) => (
              <button key={value} onClick={() => setColorScheme(value)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs transition-all ${
                  colorScheme === value ? "border-white/30 bg-white/10" : "border-[var(--surface-border)] hover:bg-white/5"
                }`}
              >
                <div className={`w-4 h-4 rounded-full ${bg}`} />
                {label}
              </button>
            ))}
          </div>
        </div>

        <button onClick={handleSave} disabled={saving}
          className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-sm transition-colors disabled:opacity-50">
          {saving ? "Saving..." : "Save settings"}
        </button>
      </div>
    </div>
  );
}
