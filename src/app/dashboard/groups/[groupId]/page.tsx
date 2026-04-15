import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Users, Globe, MapPin } from "lucide-react";
import Link from "next/link";
import MapWrapper from "@/components/map/MapWrapper";

interface Props {
  params: { groupId: string };
}

export default async function GroupMapPage({ params }: Props) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Check membership
  const { data: membership } = await supabase
    .from("group_members")
    .select("*, group:group_id(*)")
    .eq("group_id", params.groupId)
    .eq("user_id", user.id)
    .eq("status", "accepted")
    .single();

  if (!membership) notFound();

  const group = membership.group as any;

  // Get all members
  const { data: members } = await supabase
    .from("group_members")
    .select("user_id, role, profiles:user_id(id, full_name, avatar_url, username, color_scheme)")
    .eq("group_id", params.groupId)
    .eq("status", "accepted");

  // Get all visits from all members (public only)
  const memberIds = (members || []).map((m: any) => m.user_id);
  const { data: allVisits } = await supabase
    .from("visits")
    .select("*, visit_photos(*)")
    .in("user_id", memberIds)
    .eq("is_private", false);

  // Group stats
  const uniqueCountries = new Set((allVisits || []).map((v: any) => v.country_code).filter(Boolean));
  const uniqueContinents = new Set((allVisits || []).map((v: any) => v.continent).filter(Boolean));

  const COLOR_GRADIENTS: Record<string, string> = {
    emerald: "from-emerald-400 to-teal-600",
    sky: "from-sky-400 to-blue-600",
    violet: "from-violet-400 to-purple-600",
    rose: "from-rose-400 to-pink-600",
    amber: "from-amber-400 to-orange-600",
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="flex-shrink-0">
        {/* Banner */}
        <div className={`h-16 bg-gradient-to-r ${COLOR_GRADIENTS[group.cover_color] || COLOR_GRADIENTS.emerald} flex items-center px-4 gap-3`}>
          <Link href="/dashboard/groups"
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <span className="text-2xl">{group.emoji}</span>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-white truncate">{group.name}</div>
            {group.description && (
              <div className="text-xs text-white/70 truncate">{group.description}</div>
            )}
          </div>
        </div>

        {/* Stats bar */}
        <div className="flex items-center gap-4 px-4 py-2.5 glass-elevated border-b border-[var(--surface-border)] overflow-x-auto scrollbar-hide">
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Users className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-bold text-emerald-400">{members?.length || 0}</span>
            <span className="text-xs text-[var(--text-muted)]">membres</span>
          </div>
          <div className="w-px h-4 bg-[var(--surface-border)]" />
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Globe className="w-4 h-4 text-sky-400" />
            <span className="text-sm font-bold text-sky-400">{uniqueCountries.size}</span>
            <span className="text-xs text-[var(--text-muted)]">pays</span>
          </div>
          <div className="w-px h-4 bg-[var(--surface-border)]" />
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <MapPin className="w-4 h-4 text-violet-400" />
            <span className="text-sm font-bold text-violet-400">{allVisits?.length || 0}</span>
            <span className="text-xs text-[var(--text-muted)]">visites</span>
          </div>

          {/* Member avatars */}
          <div className="ml-auto flex -space-x-2 flex-shrink-0">
            {(members || []).slice(0, 5).map((m: any) => (
              <div key={m.user_id}
                className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 border-2 border-[var(--surface-bg)] flex items-center justify-center"
                title={m.profiles?.full_name || "Member"}>
                <span className="text-white text-[10px] font-bold">
                  {(m.profiles?.full_name || "?")[0].toUpperCase()}
                </span>
              </div>
            ))}
            {(members?.length || 0) > 5 && (
              <div className="w-7 h-7 rounded-full bg-white/10 border-2 border-[var(--surface-bg)] flex items-center justify-center">
                <span className="text-[var(--text-muted)] text-[10px]">+{(members?.length || 0) - 5}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Map with all members visits */}
      <div className="flex-1 relative">
        <MapWrapper
          visits={allVisits || []}
          wishlist={[]}
          userId={user.id}
          colorScheme={group.cover_color || "emerald"}
        />
      </div>
    </div>
  );
}
