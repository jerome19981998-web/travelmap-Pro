import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import PublicMapWrapper from "@/components/map/MapWrapper";
import type { Metadata } from "next";

interface Props {
  params: { token: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = createClient();
  const { data } = await supabase.from("shared_maps").select("title, description").eq("share_token", params.token).single();
  return {
    title: data?.title ? `${data.title} — TravelMap Pro` : "Shared Travel Map",
    description: data?.description || "Explore this travel map on TravelMap Pro",
  };
}

export default async function PublicMapPage({ params }: Props) {
  const supabase = createClient();

  const { data: share } = await supabase
    .from("shared_maps")
    .select("*")
    .eq("share_token", params.token)
    .eq("is_active", true)
    .single();

  if (!share) notFound();

  // Increment view count
  await supabase.from("shared_maps").update({ view_count: share.view_count + 1 }).eq("id", share.id);

  const [{ data: visits }, { data: stats }, { data: badges }, { data: profile }] = await Promise.all([
    supabase.from("visits").select("*, visit_photos(*)").eq("user_id", share.user_id).eq("is_private", false),
    share.show_stats ? supabase.from("user_stats").select("*").eq("user_id", share.user_id).single() : { data: null },
    share.show_badges ? supabase.from("user_badges").select("*, badge_definitions(*)").eq("user_id", share.user_id) : { data: null },
    supabase.from("profiles").select("full_name, avatar_url").eq("id", share.user_id).single(),
  ]);

  return (
    <div className="min-h-screen bg-[var(--surface-bg)]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 glass-elevated border-b border-[var(--surface-border)]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-sm">🗺️</div>
          <div>
            <div className="font-semibold text-sm text-[var(--text-primary)]">{share.title}</div>
            {profile?.full_name && <div className="text-xs text-[var(--text-muted)]">by {profile.full_name}</div>}
          </div>
        </div>
        <a href="/" className="px-3 py-1.5 rounded-xl glass text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
          Create your own map →
        </a>
      </div>

      {/* Stats bar */}
      {share.show_stats && stats && (
        <div className="flex items-center gap-6 px-6 py-3 glass border-b border-[var(--surface-border)] text-sm">
          <div className="flex items-center gap-1.5"><span className="text-emerald-400 font-bold">{stats.countries_visited}</span><span className="text-[var(--text-muted)]">countries</span></div>
          <div className="flex items-center gap-1.5"><span className="text-sky-400 font-bold">{stats.continents_visited}</span><span className="text-[var(--text-muted)]">continents</span></div>
          <div className="flex items-center gap-1.5"><span className="text-violet-400 font-bold">{stats.cities_visited}</span><span className="text-[var(--text-muted)]">cities</span></div>
          <div className="flex items-center gap-1.5"><span className="text-amber-400 font-bold">{stats.total_visits}</span><span className="text-[var(--text-muted)]">visits</span></div>
        </div>
      )}

      {/* Map */}
      <div style={{ height: "calc(100vh - 130px)" }}>
        <PublicMapWrapper visits={visits || []} wishlist={[]} userId={share.user_id} />
      </div>

      {/* Badges */}
      {share.show_badges && badges && badges.length > 0 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 glass rounded-2xl px-4 py-2">
          {badges.slice(0, 8).map((b: { id: string; badge_definitions: { icon: string; name: string } }) => (
            <div key={b.id} title={b.badge_definitions.name} className="text-xl cursor-default">
              {b.badge_definitions.icon}
            </div>
          ))}
          {badges.length > 8 && <div className="text-xs text-[var(--text-muted)] self-center">+{badges.length - 8}</div>}
        </div>
      )}
    </div>
  );
}
