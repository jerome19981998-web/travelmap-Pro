import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TravelMap Pro",
    short_name: "TravelMap",
    description: "Enregistrez vos voyages, villes, quartiers, souvenirs et envies sur une carte interactive.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#050a14",
    theme_color: "#10b981",
    orientation: "portrait-primary",
    categories: ["travel", "lifestyle", "navigation"],
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Carte",
        short_name: "Carte",
        description: "Ouvrir la carte de voyage",
        url: "/dashboard",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Voyages",
        short_name: "Voyages",
        description: "Voir les voyages multi-etapes",
        url: "/dashboard/trips",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Wishlist",
        short_name: "Wishlist",
        description: "Voir les destinations a visiter",
        url: "/dashboard/wishlist",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
    ],
  };
}
