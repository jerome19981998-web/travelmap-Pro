import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "TravelMap Pro — Your Journey, Visualized",
  description: "Track, visualize, and share your travel adventures on an interactive world map. Log visits, build a wishlist, earn badges, and discover the world.",
  openGraph: {
    title: "TravelMap Pro",
    description: "Your personal travel map — track countries, cities, and adventures.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
      </head>
      <body className="antialiased min-h-screen bg-[var(--surface-bg)]">
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "var(--surface-elevated)",
              color: "var(--text-primary)",
              border: "1px solid var(--surface-border)",
              borderRadius: "12px",
              backdropFilter: "blur(20px)",
            },
            success: {
              iconTheme: { primary: "#10b981", secondary: "#fff" },
            },
            error: {
              iconTheme: { primary: "#ef4444", secondary: "#fff" },
            },
          }}
        />
      </body>
    </html>
  );
}
