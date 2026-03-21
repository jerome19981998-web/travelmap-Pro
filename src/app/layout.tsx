import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { LocaleProvider } from "@/hooks/useLocale";

export const metadata: Metadata = {
  title: "TravelMap Pro — Your Journey, Visualized",
  description: "Track, visualize, and share your travel adventures on an interactive world map.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossOrigin="" />
      </head>
      <body className="antialiased min-h-screen bg-[var(--surface-bg)]">
        <LocaleProvider>
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: "var(--surface-elevated)",
                color: "var(--text-primary)",
                border: "1px solid var(--surface-border)",
                borderRadius: "12px",
              },
              success: { iconTheme: { primary: "#10b981", secondary: "#fff" } },
              error: { iconTheme: { primary: "#ef4444", secondary: "#fff" } },
            }}
          />
        </LocaleProvider>
      </body>
    </html>
  );
}
