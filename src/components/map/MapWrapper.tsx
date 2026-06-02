"use client";

import { useEffect, useRef } from "react";
import type { Visit, VisitPhoto, WishlistItem } from "@/types/database";

type VisitWithPhotos = Visit & { visit_photos: VisitPhoto[] };

interface Props {
  visits: VisitWithPhotos[];
  wishlist: WishlistItem[];
  colorScheme: string;
  isDark: boolean;
  filterMode: string;
  onVisitClick: (visit: VisitWithPhotos) => void;
}

function getVisitColor(count: number, scheme: string = "emerald"): string {
  const schemes: Record<string, string[]> = {
    emerald: ["#6ee7b7", "#34d399", "#10b981", "#059669", "#047857", "#065f46"],
    sky:     ["#7dd3fc", "#38bdf8", "#0ea5e9", "#0284c7", "#0369a1", "#075985"],
    violet:  ["#c4b5fd", "#a78bfa", "#8b5cf6", "#7c3aed", "#6d28d9", "#5b21b6"],
    rose:    ["#fda4af", "#fb7185", "#f43f5e", "#e11d48", "#be123c", "#9f1239"],
    amber:   ["#fde68a", "#fcd34d", "#f59e0b", "#d97706", "#b45309", "#92400e"],
    teal:    ["#99f6e4", "#5eead4", "#2dd4bf", "#14b8a6", "#0d9488", "#0f766e"],
  };
  const colors = schemes[scheme] || schemes.emerald;
  return colors[Math.min(Math.max(count - 1, 0), colors.length - 1)];
}

let geoCache: any = null;
async function loadGeo() {
  if (geoCache) return geoCache;
  const res = await fetch("https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson");
  geoCache = await res.json();
  return geoCache;
}

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return { r, g, b };
}

function latLngToVec3(lat: number, lng: number, radius: number) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return {
    x: -(radius * Math.sin(phi) * Math.cos(theta)),
    y: radius * Math.cos(phi),
    z: radius * Math.sin(phi) * Math.sin(theta),
  };
}

export default function GlobeView({ visits, wishlist, colorScheme, isDark, filterMode, onVisitClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<any>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    if (!containerRef.current) return;
    let mounted = true;

    const init = async () => {
      const THREE = await import("three");
      if (!mounted || !containerRef.current) return;

      const w = containerRef.current.offsetWidth;
      const h = containerRef.current.offsetHeight;

      // Scene
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(isDark ? 0x050a14 : 0xf0f9ff);

      // Camera
      const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
      camera.position.z = 2.5;

      // Renderer
      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(w, h);
      renderer.setPixelRatio(window.devicePixelRatio);
      containerRef.current.innerHTML = "";
      containerRef.current.appendChild(renderer.domElement);
      rendererRef.current = renderer;

      // Stars (dark mode)
      if (isDark) {
        const starGeo = new THREE.BufferGeometry();
        const starCount = 2000;
        const positions = new Float32Array(starCount * 3);
        for (let i = 0; i < starCount * 3; i++) {
          positions[i] = (Math.random() - 0.5) * 100;
        }
        starGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.05 });
        scene.add(new THREE.Points(starGeo, starMat));
      }

      // Globe sphere
