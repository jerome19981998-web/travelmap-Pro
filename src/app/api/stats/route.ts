import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("visits")
    .select("*, visit_photos(*)")
    .eq("user_id", user.id)
    .order("visited_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
(visits || [] as any[]).forEach((v: any) => {
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { data, error } = await supabase
    .from("visits")
    .insert({ ...body, user_id: user.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await checkAndAwardBadges(supabase, user.id);

  return NextResponse.json(data, { status: 201 });
}

async function checkAndAwardBadges(supabase: any, userId: string) {
  const TOTAL_COUNTRIES = 195;

  const [{ data: stats }, { data: allBadges }, { data: earned }] = await Promise.all([
    supabase.from("user_stats").select("*").eq("user_id", userId).single(),
    supabase.from("badge_definitions").select("*"),
    supabase.from("user_badges").select("badge_id").eq("user_id", userId),
  ]);

  if (!stats || !allBadges) return;

  const earnedIds = new Set((earned || []).map((e: any) => e.badge_id));

  for (const badge of (allBadges as any[])) {
    if (earnedIds.has(badge.id)) continue;
    const cond = badge.condition_value as Record<string, number>;

    let shouldAward = false;
    if (badge.condition_type === "countries_percent") {
      shouldAward = (stats.countries_visited / TOTAL_COUNTRIES) * 100 >= cond.threshold;
    } else if (badge.condition_type === "total_visits") {
      shouldAward = stats.total_visits >= cond.threshold;
    }

    if (shouldAward) {
      await supabase.from("user_badges").insert({ user_id: userId, badge_id: badge.id });
    }
  }
}
