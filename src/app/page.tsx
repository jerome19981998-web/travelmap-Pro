import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) redirect("/dashboard");

  return (
    <main className="min-h-screen bg-[var(--surface-bg)] overflow-hidden relative">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: "2s" }} />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-sky-500/5 rounded-full blur-3xl animate-float" />
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-grid-pattern opacity-30" />
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-sm">
            🗺️
          </div>
          <span className="font-semibold text-lg tracking-tight text-[var(--text-primary)]">
            TravelMap Pro
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/auth/login"
            className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/auth/signup"
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-medium transition-colors"
          >
            Get started free
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-[80vh] px-4 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass text-xs text-[var(--text-secondary)] mb-8 animate-fade-in">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Track every adventure. Earn every badge.
        </div>

        <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-[var(--text-primary)] mb-6 animate-slide-up leading-tight">
          Your world,
          <br />
          <span className="text-gradient-visited">mapped</span> &{" "}
          <span className="text-gradient-wishlist">explored</span>
        </h1>

        <p className="text-lg md:text-xl text-[var(--text-secondary)] max-w-2xl mb-10 animate-slide-up" style={{ animationDelay: "100ms" }}>
          An interactive travel map that tracks where you&apos;ve been, where you want to go,
          your stats, badges, and lets you share your journey with friends.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 animate-slide-up" style={{ animationDelay: "200ms" }}>
          <Link
            href="/auth/signup"
            className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-semibold transition-all duration-200 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 hover:-translate-y-0.5"
          >
            Start mapping free →
          </Link>
          <Link
            href="/demo"
            className="px-8 py-3.5 rounded-2xl glass hover:bg-white/5 text-[var(--text-primary)] font-medium transition-all duration-200 hover:-translate-y-0.5"
          >
            View demo
          </Link>
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-3 mt-16 animate-fade-in" style={{ animationDelay: "400ms" }}>
          {[
            { icon: "🗺️", text: "Interactive world map" },
            { icon: "📸", text: "Photos & memories" },
            { icon: "🏆", text: "Badges & stats" },
            { icon: "💜", text: "Wishlist & goals" },
            { icon: "🌙", text: "Dark mode" },
            { icon: "🔗", text: "Share with friends" },
          ].map(({ icon, text }) => (
            <div key={text} className="flex items-center gap-2 px-4 py-2 rounded-full glass text-sm text-[var(--text-secondary)]">
              <span>{icon}</span>
              <span>{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Stats showcase */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 pb-24">
        <div className="grid grid-cols-3 gap-4">
          {[
            { value: "195", label: "Countries to explore", color: "text-emerald-400" },
            { value: "7", label: "Continents to conquer", color: "text-sky-400" },
            { value: "∞", label: "Memories to make", color: "text-violet-400" },
          ].map(({ value, label, color }) => (
            <div key={label} className="glass rounded-2xl p-6 text-center">
              <div className={`text-3xl font-bold ${color} mb-1`}>{value}</div>
              <div className="text-xs text-[var(--text-muted)]">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
