import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[var(--surface-bg)] flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl mb-4">🗺️</div>
        <h1 className="text-4xl font-bold text-[var(--text-primary)] mb-2">Lost on the map?</h1>
        <p className="text-[var(--text-secondary)] mb-6">This page doesn&apos;t exist or has been moved.</p>
        <Link href="/" className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold transition-colors">
          Back to home →
        </Link>
      </div>
    </div>
  );
}
