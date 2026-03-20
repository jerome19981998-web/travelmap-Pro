import { createClient } from "@/lib/supabase/server";
import ShareClient from "./ShareClient";

export default async function SharePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: sharedMaps } = await supabase
    .from("shared_maps")
    .select("*")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false });

  return <ShareClient sharedMaps={sharedMaps || []} userId={user!.id} />;
}
