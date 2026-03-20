import { createClient } from "@/lib/supabase/server";
import WishlistClient from "./WishlistClient";

export default async function WishlistPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: wishlist } = await supabase
    .from("wishlist")
    .select("*")
    .eq("user_id", user!.id)
    .order("priority")
    .order("created_at", { ascending: false });

  return <WishlistClient wishlist={wishlist || []} userId={user!.id} />;
}
