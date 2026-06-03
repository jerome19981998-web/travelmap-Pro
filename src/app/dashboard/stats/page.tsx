import { createClient } from "@/lib/supabase/server";
import StatsClient from "./StatsClient";

export default async function StatsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: stats }, { data: visits }, { data: goals }, { data: wishlist }, { data: globalWishlist }, { data: globalVisits }] = await Promise.all([
    supabase.from("user_stats").select("*").eq("user_id", user!.id).single(),
    supabase.from("visits").select("*").eq("user_id", user!.id).order("visited_at"),
    supabase.from("annual_goals").select("*").eq("user_id", user!.id).order("year", { ascending: false }),
    supabase.from("wishlist").select("*").eq("user_id", user!.id),
    supabase.from("wishlist").select("*").eq("is_private", false),
    supabase.from("visits").select("*").eq("is_private", false).not("rating", "is", null),
  ]);

  return (
    <StatsClient
      stats={stats}
      visits={visits || []}
      goals={goals || []}
      wishlist={wishlist || []}
      globalWishlist={globalWishlist || []}
      globalVisits={globalVisits || []}
      userId={user!.id}
    />
  );
}
