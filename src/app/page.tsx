import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#050a14] overflow-hidden relative flex flex-col items-center justify-center">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 text-center px-4">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-lg">
            🗺️
          </div>
          <span className="font-bold text-xl text-white">TravelMap Pro</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
          Your world,{" "}
          <span className="text-emerald-400">mapped</span>
        </h1>

        <p className="text-lg text-gray-400 max-w-xl mx-auto mb-10">
          Track where you have been, plan where you want to go, earn badges and share your journey.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/auth/signup"
            className="px-8 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold transition-all">
            Start mapping free →
          </Link>
          <Link href="/auth/login"
            className="px-8 py-3.5 rounded-2xl border border-white/10 hover:bg-white/5 text-white font-medium transition-all">
            Sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
