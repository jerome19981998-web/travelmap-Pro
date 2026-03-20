import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [{ data: stats }, { data: wishlist }, { data: badges }] = await Promise.all([
    supabase.from("user_stats").select("*").eq("user_id", user.id).single(),
    supabase.from("wishlist").select("continent, priority").eq("user_id", user.id),
    supabase.from("user_badges").select("badge_id, earned_at").eq("user_id", user.id),
  ]);

  return NextResponse.json({
    stats,
    badgeCount: badges?.length || 0,
    wishlistCount: wishlist?.length || 0,
  });
}
