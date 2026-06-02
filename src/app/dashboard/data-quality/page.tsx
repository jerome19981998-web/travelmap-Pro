import { createClient } from "@/lib/supabase/server";
import DataQualityClient from "./DataQualityClient";

export default async function DataQualityPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: visits } = await supabase
    .from("visits")
    .select("*")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false });

  return <DataQualityClient visits={visits || []} />;
}
