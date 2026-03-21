import { createClient } from "@/lib/supabase/server";
import MapWrapper from "@/components/map/MapWrapper";
import QuickStats from "@/components/stats/QuickStats";

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: visits }, { data: wishlist }, { data: stats }, { data: profile }] = await Promise.all([
    supabase.from("visits").select("*, visit_photos(*)").eq("user_id", user!.id).order("visited_at", { ascending: false }),
    supabase.from("wishlist").select("*").eq("user_id", user!.id),
    supabase.from("user_stats").select("*").eq("user_id", user!.id).single(),
    supabase.from("profiles").select("color_scheme").eq("id", user!.id).single(),
  ]);

  return (
    <div className="flex flex-col h-screen">
      <QuickStats stats={stats} />
      <div className="flex-1 relative">
        <MapWrapper
          visits={visits || []}
          wishlist={wishlist || []}
          userId={user!.id}
          colorScheme={profile?.color_scheme || "emerald"}
        />
      </div>
    </div>
  );
}
