import { createClient } from "@/lib/supabase/server";
import TripsClient from "./TripsClient";

export default async function TripsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const tripsTable = supabase.from("trips") as any;
  const stopsTable = supabase.from("trip_stops") as any;

  const [{ data: trips, error: tripsError }, { data: stops, error: stopsError }, { data: legacyVisits }] = await Promise.all([
    tripsTable
      .select("*")
      .eq("user_id", user!.id)
      .order("started_at", { ascending: false, nullsFirst: false }),
    stopsTable
      .select("*")
      .eq("user_id", user!.id)
      .order("stop_order", { ascending: true }),
    supabase
      .from("visits")
      .select("*")
      .eq("user_id", user!.id)
      .ilike("notes", "%Voyage multi-etapes%")
      .order("visited_at", { ascending: true }),
  ]);

  return (
    <TripsClient
      trips={trips || []}
      stops={stops || []}
      legacyVisits={legacyVisits || []}
      setupError={tripsError?.message || stopsError?.message || null}
      userId={user!.id}
    />
  );
}
