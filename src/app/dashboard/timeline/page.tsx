import { createClient } from "@/lib/supabase/server";
import TimelineClient from "./TimelineClient";

export default async function TimelinePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: visits } = await supabase
    .from("visits")
    .select("*, visit_photos(*)")
    .eq("user_id", user!.id)
    .order("visited_at", { ascending: false });

  return <TimelineClient visits={visits || []} />;
}
