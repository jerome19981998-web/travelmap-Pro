import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import MapWrapper from "@/components/map/MapWrapper";
import { ArrowLeft, MapPin, Globe, Trophy } from "lucide-react";
import Link from "next/link";

interface Props {
  params: { userId: string };
}

export default async function FriendMapPage({ params }: Props) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Check they are friends
  const { data: friendship } = await supabase
    .from("friendships")
    .select("*")
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
    .or(`requester_id.eq.${params.userId},addressee_id.eq.${params.userId}`)
    .eq("status", "accepted")
    .single();

  if (!friendship) notFound();

  const [{ data: profile }, { data: visits }, { data: stats }, { data: badges }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", params.userId).single(),
    supabase.from("visits").select("*, visit_photos(*)").eq("user_id", params.userId).eq("is_private", false),
    supabase.from("user_stats").select("*").eq("user_id", params.userId).single(),
    supabase.from("user_badges").select("*, badge_definitions(*)").eq("user_id", params.userId),
  ]);

  if (!profile) notFound();

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-4 glass-elevated border-b border-[var(--surface-border)] flex-shrink-0">
        <Link href="/dashboard/friends"
          className="p-2 rounded-xl hover:bg-white/5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>

        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold">
              {(profile.full_name || "?")[0].toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <div className="font-bold text-[var(--text-primary)] truncate">
              {profile.full_name || "Traveler"}
            </div>
            {profile.username && (
              <div className="text-xs text-[var(--text-muted)]">@{profile.username}</div>
            )}
          </div>
        </div>

        {/* Stats mini */}
        <div className="hidden sm:flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <Globe className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-emerald-400">{stats?.countries_visited || 0}</span>
            <span className="text-[var(--text-muted)]">pays</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-sky-400" />
            <span className="font-bold text-sky-400">{stats?.total_visits || 0}</span>
            <span className="text-[var(--text-muted)]">visites</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="font-bold text-amber-400">{badges?.length || 0}</span>
            <span className="text-[var(--text-muted)]">badges</span>
          </div>
        </div>
      </div>

      {/* Badges bar */}
      {badges && badges.length > 0 && (
        <div className="flex items-center gap-2 px-6 py-2 glass border-b border-[var(--surface-border)] overflow-x-auto scrollbar-hide flex-shrink-0">
          <span className="text-xs text-[var(--text-muted)] flex-shrink-0">Badges :</span>
          {badges.map((b: any) => (
            <span key={b.id} title={b.badge_definitions?.name} className="text-xl flex-shrink-0 cursor-default">
              {b.badge_definitions?.icon}
            </span>
          ))}
        </div>
      )}

      {/* Map */}
      <div className="flex-1 relative">
        <MapWrapper
          visits={visits || []}
          wishlist={[]}
          userId={params.userId}
          colorScheme={profile.color_scheme || "emerald"}
        />
      </div>
    </div>
  );
}
