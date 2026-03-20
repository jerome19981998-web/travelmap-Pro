import { createClient } from "@/lib/supabase/server";
import BadgesClient from "./BadgesClient";

export default async function BadgesPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: allBadges }, { data: earned }, { data: stats }] = await Promise.all([
    supabase.from("badge_definitions").select("*").order("tier"),
    supabase.from("user_badges").select("*, badge_definitions(*)").eq("user_id", user!.id),
    supabase.from("user_stats").select("*").eq("user_id", user!.id).single(),
  ]);

  return <BadgesClient allBadges={allBadges || []} earned={earned || []} stats={stats} userId={user!.id} />;
}
