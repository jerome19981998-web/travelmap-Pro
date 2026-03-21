import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import BottomNav from "@/components/layout/BottomNav";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) {
    await supabase.from("profiles").insert({ id: user.id }).single();
  }

  const finalProfile = profile || {
    id: user.id, full_name: null, avatar_url: null, username: null,
    bio: null, home_country: null, preferred_currency: "EUR",
    theme_preference: "dark", color_scheme: "emerald", is_public: false,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString()
  };

  return (
    <div className="flex min-h-screen bg-[var(--surface-bg)]">
      {/* Sidebar — desktop only */}
      <div className="hidden lg:block">
        <Sidebar profile={finalProfile as any} user={user} />
      </div>

      {/* Main content */}
      <main className="flex-1 lg:ml-64 min-h-screen pb-20 lg:pb-0">
        {children}
      </main>

      {/* Bottom nav — mobile only */}
      <BottomNav />
    </div>
  );
}
