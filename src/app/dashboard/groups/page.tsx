import { createClient } from "@/lib/supabase/server";
import GroupsClient from "./GroupsClient";

export default async function GroupsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: myGroups }, { data: friends }] = await Promise.all([
    supabase.from("group_members").select(`
      id, role, status, joined_at,
      group:group_id(
        id, name, description, emoji, cover_color, owner_id, created_at,
        group_members(count)
      )
    `).eq("user_id", user!.id).eq("status", "accepted"),

    supabase.from("friendships").select(`
      requester:requester_id(id, full_name, avatar_url, username),
      addressee:addressee_id(id, full_name, avatar_url, username)
    `).or(`requester_id.eq.${user!.id},addressee_id.eq.${user!.id}`)
      .eq("status", "accepted"),
  ]);

  const friendProfiles = (friends || []).map((f: any) =>
    f.requester.id === user!.id ? f.addressee : f.requester
  );

  return (
    <GroupsClient
      userId={user!.id}
      groups={myGroups || []}
      friends={friendProfiles}
    />
  );
}
