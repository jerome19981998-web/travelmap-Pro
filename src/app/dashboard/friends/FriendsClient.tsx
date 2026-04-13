"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { Users, UserPlus, Search, Check, X, Bell, Map, Trophy } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  username: string | null;
}

interface Friendship {
  id: string;
  status: string;
  created_at: string;
  requester: Profile;
  addressee: Profile;
}

interface Notification {
  id: string;
  type: string;
  message: string;
  is_read: boolean;
  created_at: string;
  from_user_id: string | null;
}

interface Props {
  userId: string;
  friends: Friendship[];
  pending: Friendship[];
  notifications: Notification[];
}

type Tab = "friends" | "requests" | "search" | "notifications";

export default function FriendsClient({ userId, friends, pending, notifications }: Props) {
  const [tab, setTab] = useState<Tab>("friends");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [friendsList, setFriendsList] = useState(friends);
  const [pendingList, setPendingList] = useState(pending);
  const [notifList, setNotifList] = useState(notifications);

  const getOtherUser = (f: Friendship) =>
    f.requester.id === userId ? f.addressee : f.requester;

  const isRequester = (f: Friendship) => f.requester.id === userId;

  // Search users
  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    if (q.trim().length < 2) { setSearchResults([]); return; }
    setSearching(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, username")
      .or(`full_name.ilike.%${q}%,username.ilike.%${q}%`)
      .neq("id", userId)
      .eq("is_public", true)
      .limit(10);
    setSearchResults(data || []);
    setSearching(false);
  };

  // Send friend request
  const sendRequest = async (targetId: string) => {
    const supabase = createClient();
    const { error } = await supabase.from("friendships").insert({
      requester_id: userId,
      addressee_id: targetId,
    });
    if (error) toast.error(error.message);
    else toast.success("Friend request sent! 🤝");
  };

  // Accept friend request
  const acceptRequest = async (friendshipId: string) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("friendships")
      .update({ status: "accepted" })
      .eq("id", friendshipId);
    if (error) toast.error(error.message);
    else {
      toast.success("Friend request accepted! 🎉");
      const accepted = pendingList.find(f => f.id === friendshipId);
      if (accepted) {
        setFriendsList(prev => [...prev, { ...accepted, status: "accepted" }]);
        setPendingList(prev => prev.filter(f => f.id !== friendshipId));
      }
    }
  };

  // Reject friend request
  const rejectRequest = async (friendshipId: string) => {
    const supabase = createClient();
    await supabase.from("friendships").update({ status: "rejected" }).eq("id", friendshipId);
    setPendingList(prev => prev.filter(f => f.id !== friendshipId));
    toast.success("Request declined");
  };

  // Remove friend
  const removeFriend = async (friendshipId: string) => {
    if (!confirm("Remove this friend?")) return;
    const supabase = createClient();
    await supabase.from("friendships").delete().eq("id", friendshipId);
    setFriendsList(prev => prev.filter(f => f.id !== friendshipId));
    toast.success("Friend removed");
  };

  // Mark notifications as read
  const markAllRead = async () => {
    const supabase = createClient();
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", userId);
    setNotifList([]);
  };

  const incomingRequests = pendingList.filter(f => f.addressee.id === userId);
  const outgoingRequests = pendingList.filter(f => f.requester.id === userId);

  const Avatar = ({ profile, size = 40 }: { profile: Profile; size?: number }) => (
    <div className={`rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center overflow-hidden flex-shrink-0`}
      style={{ width: size, height: size }}>
      {profile.avatar_url ? (
        <Image src={profile.avatar_url} alt="" width={size} height={size} className="object-cover" />
      ) : (
        <span className="text-white font-bold" style={{ fontSize: size * 0.4 }}>
          {(profile.full_name || profile.username || "?")[0].toUpperCase()}
        </span>
      )}
    </div>
  );

  const tabs = [
    { id: "friends" as Tab, icon: Users, label: "Amis", count: friendsList.length },
    { id: "requests" as Tab, icon: UserPlus, label: "Demandes", count: incomingRequests.length },
    { id: "search" as Tab, icon: Search, label: "Chercher", count: 0 },
    { id: "notifications" as Tab, icon: Bell, label: "Notifs", count: notifList.length },
  ];

  return (
    <div className="p-4 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
          <Users className="w-6 h-6 text-emerald-400" />
          Amis
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          {friendsList.length} ami{friendsList.length > 1 ? "s" : ""}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 glass rounded-2xl p-1 mb-6">
        {tabs.map(({ id, icon: Icon, label, count }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-all relative ${
              tab === id ? "bg-emerald-500/20 text-emerald-300" : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            }`}>
            <Icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{label}</span>
            {count > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-white text-[10px] flex items-center justify-center font-bold">
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Friends list */}
      {tab === "friends" && (
        <div className="space-y-3">
          {friendsList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Users className="w-12 h-12 text-[var(--text-muted)]" />
              <p className="text-[var(--text-secondary)]">Pas encore d&apos;amis</p>
              <button onClick={() => setTab("search")}
                className="px-4 py-2 rounded-xl bg-emerald-500 text-white text-sm hover:bg-emerald-400 transition-colors">
                Chercher des amis
              </button>
            </div>
          ) : (
            friendsList.map(friendship => {
              const friend = getOtherUser(friendship);
              return (
                <div key={friendship.id} className="glass rounded-2xl p-4 flex items-center gap-4 hover:border-emerald-500/20 border border-transparent transition-all">
                  <Avatar profile={friend} size={48} />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-[var(--text-primary)] truncate">
                      {friend.full_name || friend.username || "Traveler"}
                    </div>
                    {friend.username && (
                      <div className="text-xs text-[var(--text-muted)]">@{friend.username}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href={`/dashboard/friends/${friend.id}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 text-xs font-medium hover:bg-emerald-500/20 transition-colors border border-emerald-500/20">
                      <Map className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Carte</span>
                    </Link>
                    <button onClick={() => removeFriend(friendship.id)}
                      className="p-1.5 rounded-xl hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-400 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Requests */}
      {tab === "requests" && (
        <div className="space-y-6">
          {/* Incoming */}
          {incomingRequests.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-[var(--text-secondary)] mb-3">
                Demandes reçues ({incomingRequests.length})
              </h2>
              <div className="space-y-3">
                {incomingRequests.map(f => (
                  <div key={f.id} className="glass rounded-2xl p-4 flex items-center gap-4">
                    <Avatar profile={f.requester} size={48} />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-[var(--text-primary)] truncate">
                        {f.requester.full_name || f.requester.username || "Traveler"}
                      </div>
                      <div className="text-xs text-[var(--text-muted)]">
                        {new Date(f.created_at).toLocaleDateString("fr-FR")}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => acceptRequest(f.id)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500 text-white text-xs font-semibold hover:bg-emerald-400 transition-colors">
                        <Check className="w-3.5 h-3.5" />
                        Accepter
                      </button>
                      <button onClick={() => rejectRequest(f.id)}
                        className="p-1.5 rounded-xl hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-400 transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Outgoing */}
          {outgoingRequests.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-[var(--text-secondary)] mb-3">
                Demandes envoyées ({outgoingRequests.length})
              </h2>
              <div className="space-y-3">
                {outgoingRequests.map(f => (
                  <div key={f.id} className="glass rounded-2xl p-4 flex items-center gap-4 opacity-70">
                    <Avatar profile={f.addressee} size={48} />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-[var(--text-primary)] truncate">
                        {f.addressee.full_name || f.addressee.username || "Traveler"}
                      </div>
                      <div className="text-xs text-amber-400">⏳ En attente</div>
                    </div>
                    <button onClick={() => rejectRequest(f.id)}
                      className="text-xs text-[var(--text-muted)] hover:text-red-400 transition-colors">
                      Annuler
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {incomingRequests.length === 0 && outgoingRequests.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <UserPlus className="w-12 h-12 text-[var(--text-muted)]" />
              <p className="text-[var(--text-secondary)]">Aucune demande en cours</p>
            </div>
          )}
        </div>
      )}

      {/* Search */}
      {tab === "search" && (
        <div>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input
              value={searchQuery}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Chercher par nom ou @username..."
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-[var(--surface-border)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-emerald-500/50"
            />
          </div>

          <div className="text-xs text-[var(--text-muted)] mb-4">
            ⚠️ Seuls les profils publics apparaissent dans la recherche
          </div>

          {searching && (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
            </div>
          )}

          <div className="space-y-3">
            {searchResults.map(profile => {
              const alreadyFriend = friendsList.some(f =>
                getOtherUser(f).id === profile.id
              );
              const requestSent = outgoingRequests.some(f => f.addressee.id === profile.id);

              return (
                <div key={profile.id} className="glass rounded-2xl p-4 flex items-center gap-4">
                  <Avatar profile={profile} size={48} />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-[var(--text-primary)] truncate">
                      {profile.full_name || profile.username || "Traveler"}
                    </div>
                    {profile.username && (
                      <div className="text-xs text-[var(--text-muted)]">@{profile.username}</div>
                    )}
                  </div>
                  {alreadyFriend ? (
                    <span className="text-xs text-emerald-400 font-medium">✓ Ami</span>
                  ) : requestSent ? (
                    <span className="text-xs text-amber-400 font-medium">⏳ Envoyé</span>
                  ) : (
                    <button onClick={() => sendRequest(profile.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 text-white text-xs font-semibold hover:bg-emerald-400 transition-colors">
                      <UserPlus className="w-3.5 h-3.5" />
                      Ajouter
                    </button>
                  )}
                </div>
              );
            })}

            {searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
              <div className="text-center py-8 text-[var(--text-muted)] text-sm">
                Aucun résultat pour &quot;{searchQuery}&quot;
              </div>
            )}
          </div>
        </div>
      )}

      {/* Notifications */}
      {tab === "notifications" && (
        <div>
          {notifList.length > 0 && (
            <div className="flex justify-end mb-4">
              <button onClick={markAllRead}
                className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors">
                Tout marquer comme lu
              </button>
            </div>
          )}

          {notifList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Bell className="w-12 h-12 text-[var(--text-muted)]" />
              <p className="text-[var(--text-secondary)]">Aucune notification</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifList.map(notif => (
                <div key={notif.id} className="glass rounded-2xl p-4 flex items-start gap-3 border border-emerald-500/10">
                  <div className="text-2xl mt-0.5">
                    {notif.type === "friend_request" ? "👋" :
                     notif.type === "friend_accepted" ? "🤝" :
                     notif.type === "group_invite" ? "👥" :
                     notif.type === "new_badge" ? "🏆" : "✈️"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[var(--text-primary)]">{notif.message}</p>
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      {new Date(notif.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
