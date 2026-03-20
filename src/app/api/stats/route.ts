import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [{ data: stats }, { data: visits }, { data: wishlist }, { data: badges }] = await Promise.all([
    supabase.from("user_stats").select("*").eq("user_id", user.id).single(),
    supabase.from("visits").select("continent, country_code, country_name, visited_at").eq("user_id", user.id),
    supabase.from("wishlist").select("continent, priority").eq("user_id", user.id),
    supabase.from("user_badges").select("badge_id, earned_at").eq("user_id", user.id),
  ]);

  // Build continent breakdown
  const continentMap: Record<string, Set<string>> = {};
  (visits || [] as any[]).forEach((v: any) => {
    if (!v.continent || !v.country_code) return;
    if (!continentMap[v.continent]) continentMap[v.continent] = new Set();
    continentMap[v.continent].add(v.country_code);
  });

  const continentBreakdown = Object.entries(continentMap).map(([name, countries]) => ({
    continent: name,
    countries: countries.size,
  }));

  // Timeline by year
  const yearMap: Record<number, number> = {};
  (visits || []).forEach((v) => {
    if (!v.visited_at) return;
    const yr = new Date(v.visited_at).getFullYear();
    yearMap[yr] = (yearMap[yr] || 0) + 1;
  });
  const timeline = Object.entries(yearMap)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([year, count]) => ({ year: Number(year), count }));

  return NextResponse.json({
    stats,
    continentBreakdown,
    timeline,
    badgeCount: badges?.length || 0,
    wishlistCount: wishlist?.length || 0,
  });
}
