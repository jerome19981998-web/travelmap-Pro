"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { Users, Plus, X, Settings, Map } from "lucide-react";
import Link from "next/link";

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  username: string | null;
}

interface Group {
  id: string;
  name: string;
  description: string | null;
  emoji: string;
  cover_color: string;
  owner_id: string;
  created_at: string;
  group_members: { count: number }[];
}

interface GroupMember {
  id: string;
  role: string;
  status: string;
  group: Group;
}

interface Props {
  userId: string;
  groups: GroupMember[];
  friends: Profile[];
}

const COLORS = [
  { value: "emerald", bg: "from-emerald-400 to-teal-600" },
  { value: "sky", bg: "from-sky-400 to-blue-600" },
  { value: "violet", bg: "from-violet-400 to-purple-600" },
  { value: "rose", bg: "from-rose-400 to-pink-600" },
  { value: "amber", bg: "from-amber-400 to-orange-600" },
];

const EMOJIS = ["✈️", "🌍", "🏖️", "🏔️", "🗺️", "🚂", "⛵", "🎒", "🏕️", "🌴"];

export default function GroupsClient({ userId, groups, friends }: Props) {
  const [groupList, setGroupList] = useState(groups);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [emoji, setEmoji] = useState("✈️");
  const [color, setColor] = useState("emerald");
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const createGroup = async () => {
    if (!name.trim()) { toast.error("Ajoute un nom !"); return; }
    setSaving(true);
    const supabase = createClient();

    const { data: group, error } = await supabase
      .from("groups")
      .insert({ name, description: description || null, emoji, cover_color: color, owner_id: userId })
      .select()
      .single();

    if (error) { toast.error(error.message); setSaving(false); return; }

    // Invite selected friends
    if (selectedFriends.length > 0) {
      await supabase.from("group_members").insert(
        selectedFriends.map(friendId => ({
          group_id: group.id,
          user_id: friendId,
          role: "member",
          status: "pending",
          invited_by: userId,
        }))
      );
    }

    toast.success("Groupe créé ! 🎉");
    setCreating(false);
    setName(""); setDescription(""); setSelectedFriends([]);

    // Refresh
    const { data: updated } = await supabase
      .from("group_members")
      .select(`id, role, status, group:group_id(id, name, description, emoji, cover_color, owner_id, created_at, group_members(count))`)
      .eq("user_id", userId).eq("status", "accepted");
    if (updated) setGroupList(updated);
    setSaving(false);
  };

  const leaveGroup = async (groupId: string) => {
    if (!confirm("Quitter ce groupe ?")) return;
    const supabase = createClient();
    await supabase.from("group_members").delete().eq("group_id", groupId).eq("user_id", userId);
    setGroupList(prev => prev.filter(g => g.group.id !== groupId));
    toast.success("Groupe quitté");
  };

  const toggleFriend = (friendId: string) => {
    setSelectedFriends(prev =>
      prev.includes(friendId) ? prev.filter(id => id !== friendId) : [...prev, friendId]
    );
  };

  const getColorBg = (c: string) => COLORS.find(col => col.value === c)?.bg || COLORS[0].bg;

  return (
    <div className="p-4 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Users className="w-6 h-6 text-sky-400" />
            Groupes
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            {groupList.length} groupe{groupList.length > 1 ? "s" : ""}
          </p>
        </div>
        <button onClick={() => setCreating(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-sm font-semibold transition-colors">
          <Plus className="w-4 h-4" />
          Créer
        </button>
      </div>

      {/* Create form */}
      {creating && (
        <div className="glass rounded-2xl p-5 mb-6 border border-sky-500/20">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-[var(--text-primary)]">Nouveau groupe</h2>
            <button onClick={() => setCreating(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Emoji picker */}
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-2">Emoji</label>
              <div className="flex gap-2 flex-wrap">
                {EMOJIS.map(e => (
                  <button key={e} onClick={() => setEmoji(e)}
                    className={`text-xl p-1.5 rounded-lg transition-all ${emoji === e ? "bg-white/20 scale-110" : "hover:bg-white/10"}`}>
                    {e}
                  </button>
                ))}
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1.5">Nom *</label>
              <input value={name} onChange={e => setName(e.target.value)}
                placeholder="Road trip Europe 2025"
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-[var(--surface-border)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-sky-500/50" />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1.5">Description</label>
              <input value={description} onChange={e => setDescription(e.target.value)}
                placeholder="Notre aventure en Europe..."
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-[var(--surface-border)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-sky-500/50" />
            </div>

            {/* Color */}
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-2">Couleur</label>
              <div className="flex gap-2">
                {COLORS.map(c => (
                  <button key={c.value} onClick={() => setColor(c.value)}
                    className={`w-8 h-8 rounded-full bg-gradient-to-br ${c.bg} transition-transform ${color === c.value ? "scale-125 ring-2 ring-white/50" : ""}`} />
                ))}
              </div>
            </div>

            {/* Invite friends */}
            {friends.length > 0 && (
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-2">
                  Inviter des amis ({selectedFriends.length} sélectionné{selectedFriends.length > 1 ? "s" : ""})
                </label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {friends.map(friend => (
                    <button key={friend.id} onClick={() => toggleFriend(friend.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all ${
                        selectedFriends.includes(friend.id)
                          ? "bg-sky-500/20 border border-sky-500/30"
                          : "hover:bg-white/5 border border-transparent"
                      }`}>
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xs font-bold">
                          {(friend.full_name || "?")[0].toUpperCase()}
                        </span>
                      </div>
                      <span className="text-sm text-[var(--text-primary)]">
                        {friend.full_name || friend.username || "Traveler"}
                      </span>
                      {selectedFriends.includes(friend.id) && (
                        <span className="ml-auto text-sky-400 text-xs">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button onClick={() => setCreating(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/5 text-sm text-[var(--text-secondary)] hover:bg-white/10 transition-colors">
                Annuler
              </button>
              <button onClick={createGroup} disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-sm font-semibold transition-colors disabled:opacity-50">
                {saving ? "Création..." : "Créer le groupe"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Groups list */}
      {groupList.length === 0 && !creating ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Users className="w-12 h-12 text-[var(--text-muted)]" />
          <p className="text-[var(--text-secondary)]">Aucun groupe pour l&apos;instant</p>
          <button onClick={() => setCreating(true)}
            className="px-4 py-2 rounded-xl bg-sky-500 text-white text-sm hover:bg-sky-400 transition-colors">
            Créer votre premier groupe
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {groupList.map(gm => {
            const g = gm.group;
            const memberCount = g.group_members?.[0]?.count || 0;
            const isOwner = g.owner_id === userId;
            const colorBg = getColorBg(g.cover_color);

            return (
              <div key={g.id} className="glass rounded-2xl overflow-hidden hover:border-sky-500/20 border border-transparent transition-all group">
                {/* Cover */}
                <div className={`h-16 bg-gradient-to-br ${colorBg} flex items-center justify-center relative`}>
                  <span className="text-4xl">{g.emoji}</span>
                  {isOwner && (
                    <div className="absolute top-2 right-2 bg-black/30 rounded-lg px-1.5 py-0.5 text-[10px] text-white">
                      Admin
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <h3 className="font-semibold text-[var(--text-primary)] truncate">{g.name}</h3>
                  {g.description && (
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5 truncate">{g.description}</p>
                  )}
                  <div className="text-xs text-[var(--text-muted)] mt-2">
                    👥 {memberCount} membre{memberCount > 1 ? "s" : ""}
                  </div>

                  <div className="flex gap-2 mt-3 pt-3 border-t border-[var(--surface-border)]">
                    <Link href={`/dashboard/groups/${g.id}`}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-sky-500/10 text-sky-400 text-xs font-medium hover:bg-sky-500/20 transition-colors border border-sky-500/20">
                      <Map className="w-3.5 h-3.5" />
                      Carte
                    </Link>
                    {isOwner && (
                      <Link href={`/dashboard/groups/${g.id}/settings`}
                        className="p-1.5 rounded-xl hover:bg-white/5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                        <Settings className="w-4 h-4" />
                      </Link>
                    )}
                    {!isOwner && (
                      <button onClick={() => leaveGroup(g.id)}
                        className="p-1.5 rounded-xl hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-400 transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
