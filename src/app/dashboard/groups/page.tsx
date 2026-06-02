import { createClient } from "@/lib/supabase/server";
import GroupsClient from "./GroupsClient";

function firstRelation<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] || null : value;
}

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

  const normalizedGroups = (myGroups || []).map((membership: any) => ({
    ...membership,
    group: firstRelation(membership.group),
  })).filter((membership: any) => membership.group);

  const friendProfiles = (friends || []).map((f: any) => {
    const requester = firstRelation(f.requester);
    const addressee = firstRelation(f.addressee);
    return requester?.id === user!.id ? addressee : requester;
  }).filter(Boolean);

  return (
    <GroupsClient
      userId={user!.id}
      groups={normalizedGroups}
      friends={friendProfiles}
    />
  );
}
