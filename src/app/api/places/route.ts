import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");

  if (!q) return NextResponse.json({ error: "Query required" }, { status: 400 });

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=8&addressdetails=1`,
      {
        headers: {
          "User-Agent": "TravelMapPro/1.0 (contact@travelmappro.app)",
          "Accept-Language": "en",
        },
        next: { revalidate: 3600 }, // Cache 1h
      }
    );

    if (!res.ok) throw new Error("Nominatim error");
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
