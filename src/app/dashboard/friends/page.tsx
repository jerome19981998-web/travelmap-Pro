import { createClient } from "@/lib/supabase/server";
import FriendsClient from "./FriendsClient";

export default async function FriendsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: friends }, { data: pending }, { data: notifications }] = await Promise.all([
    // Accepted friends
    supabase.from("friendships").select(`
      id, status, created_at,
      requester:requester_id(id, full_name, avatar_url, username),
      addressee:addressee_id(id, full_name, avatar_url, username)
    `).or(`requester_id.eq.${user!.id},addressee_id.eq.${user!.id}`)
      .eq("status", "accepted"),

    // Pending requests
    supabase.from("friendships").select(`
      id, status, created_at,
      requester:requester_id(id, full_name, avatar_url, username),
      addressee:addressee_id(id, full_name, avatar_url, username)
    `).or(`requester_id.eq.${user!.id},addressee_id.eq.${user!.id}`)
      .eq("status", "pending"),

    // Unread notifications
    supabase.from("notifications").select("*")
      .eq("user_id", user!.id)
      .eq("is_read", false)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <FriendsClient
      userId={user!.id}
      friends={friends || []}
      pending={pending || []}
      notifications={notifications || []}
    />
  );
}
