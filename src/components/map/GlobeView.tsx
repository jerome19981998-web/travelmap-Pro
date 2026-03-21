"use client";

import { useEffect, useRef } from "react";
import type { Visit, WishlistItem } from "@/types/database";

interface Props {
  visits: (Visit & { visit_photos: { url: string; is_cover: boolean }[] })[];
  wishlist: WishlistItem[];
  colorScheme: string;
  isDark: boolean;
  filterMode: string;
  onVisitClick: (visit: Visit & { visit_photos: { url: string; is_cover: boolean }[] }) => void;
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

function latLngToXYZ(lat: number, lng: number, radius: number) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return {
    x: -(radius * Math.sin(phi) * Math.cos(theta)),
    y: radius * Math.cos(phi),
    z: radius * Math.sin(phi) * Math.sin(theta),
  };
}

export default function GlobeView({ visits, wishlist, colorScheme, isDark, filterMode, onVisitClick }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const rotationRef = useRef({ x: 0.3, y: 0 });
  const isDragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const autoRotate = useRef(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener("resize", resize);

    const countryVisitCounts: Record<string, number> = {};
    visits.forEach(v => {
      if (v.country_code) {
        const code = v.country_code.toUpperCase();
        countryVisitCounts[code] = (countryVisitCounts[code] || 0) + 1;
      }
    });

    const project = (lat: number, lng: number, radius: number, cx: number, cy: number) => {
      const pos = latLngToXYZ(lat, lng, radius);
      const rotY = pos.x * Math.cos(rotationRef.current.y) - pos.z * Math.sin(rotationRef.current.y);
      const rotZ = pos.x * Math.sin(rotationRef.current.y) + pos.z * Math.cos(rotationRef.current.y);
      const rotX2 = rotY * Math.cos(rotationRef.current.x) - pos.y * Math.sin(rotationRef.current.x);
      const rotY2 = rotY * Math.sin(rotationRef.current.x) + pos.y * Math.cos(rotationRef.current.x);
      return { x: cx + rotX2, y: cy - rotY2, visible: rotZ > -radius * 0.1 };
    };

    const draw = () => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      const cx = w / 2;
      const cy = h / 2;
      const radius = Math.min(w, h) * 0.42;

      ctx.clearRect(0, 0, w, h);

      // Background
      ctx.fillStyle = isDark ? "#050a14" : "#f0f9ff";
      ctx.fillRect(0, 0, w, h);

      // Ocean gradient
      const oceanGrad = ctx.createRadialGradient(cx - radius * 0.3, cy - radius * 0.3, 0, cx, cy, radius);
      if (isDark) {
        oceanGrad.addColorStop(0, "#1e3a5f");
        oceanGrad.addColorStop(0.5, "#0f2744");
        oceanGrad.addColorStop(1, "#071a2e");
      } else {
        oceanGrad.addColorStop(0, "#bfdbfe");
        oceanGrad.addColorStop(0.5, "#93c5fd");
        oceanGrad.addColorStop(1, "#60a5fa");
      }
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = oceanGrad;
      ctx.fill();

      // Grid lines
      ctx.strokeStyle = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.06)";
      ctx.lineWidth = 0.5;
      for (let lat = -75; lat <= 75; lat += 15) {
        ctx.beginPath();
        let first = true;
        for (let lng = -180; lng <= 180; lng += 3) {
          const pt = project(lat, lng, radius, cx, cy);
          if (pt.visible) {
            if (first) { ctx.moveTo(pt.x, pt.y); first = false; }
            else ctx.lineTo(pt.x, pt.y);
          } else { first = true; }
        }
        ctx.stroke();
      }
      for (let lng = -180; lng <= 180; lng += 30) {
        ctx.beginPath();
        let first = true;
        for (let lat = -90; lat <= 90; lat += 3) {
          const pt = project(lat, lng, radius, cx, cy);
          if (pt.visible) {
            if (first) { ctx.moveTo(pt.x, pt.y); first = false; }
            else ctx.lineTo(pt.x, pt.y);
          } else { first = true; }
        }
        ctx.stroke();
      }

      // Filter logic
      const showCities = filterMode === "all" || filterMode === "cities";
      const showNeighborhoods = filterMode === "all" || filterMode === "neighborhoods";
      const showWishlist = filterMode === "all" || filterMode === "wishlist";

      // Visited markers
      if (filterMode !== "wishlist") {
        visits.forEach(visit => {
          if (!visit.lat || !visit.lng) return;
          const type = visit.place_type;
          const isNeighborhood = type === "neighborhood";
          if (filterMode === "countries") return;
          if (filterMode === "cities" && isNeighborhood) return;
          if (filterMode === "neighborhoods" && !isNeighborhood) return;

          const pt = project(visit.lat, visit.lng, radius, cx, cy);
          if (!pt.visible) return;

          const count = countryVisitCounts[visit.country_code?.toUpperCase() || ""] || 1;
          const color = getVisitColor(count, colorScheme);
          const size = isNeighborhood ? 3 : 5;

          // Glow
          const glow = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, size * 3);
          glow.addColorStop(0, color + "80");
          glow.addColorStop(1, "transparent");
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, size * 3, 0, Math.PI * 2);
          ctx.fillStyle = glow;
          ctx.fill();

          // Dot
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, size, 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.fill();
          ctx.strokeStyle = "rgba(255,255,255,0.6)";
          ctx.lineWidth = 1;
          ctx.stroke();
        });
      }

      // Wishlist markers
      if (showWishlist) {
        wishlist.forEach(item => {
          if (!item.lat || !item.lng) return;
          const pt = project(item.lat, item.lng, radius, cx, cy);
          if (!pt.visible) return;
          const pc = item.priority === "high" ? "#ef4444" : item.priority === "low" ? "#6b7280" : "#8b5cf6";

          const glow = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, 12);
          glow.addColorStop(0, pc + "60");
          glow.addColorStop(1, "transparent");
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 12, 0, Math.PI * 2);
          ctx.fillStyle = glow;
          ctx.fill();

          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
          ctx.fillStyle = pc;
          ctx.fill();
          ctx.strokeStyle = "rgba(255,255,255,0.5)";
          ctx.lineWidth = 1;
          ctx.stroke();
        });
      }

      // Globe shine
      const shineGrad = ctx.createRadialGradient(cx - radius * 0.4, cy - radius * 0.4, 0, cx, cy, radius);
      shineGrad.addColorStop(0, isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.4)");
      shineGrad.addColorStop(0.5, "transparent");
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = shineGrad;
      ctx.fill();

      // Border
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Auto rotate
      if (autoRotate.current && !isDragging.current) {
        rotationRef.current.y += 0.003;
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);

    // Mouse events
    const onMouseDown = (e: MouseEvent) => {
      isDragging.current = true;
      autoRotate.current = false;
      lastPos.current = { x: e.clientX, y: e.clientY };
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const dx = e.clientX - lastPos.current.x;
      const dy = e.clientY - lastPos.current.y;
      rotationRef.current.y += dx * 0.005;
      rotationRef.current.x += dy * 0.005;
      rotationRef.current.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, rotationRef.current.x));
      lastPos.current = { x: e.clientX, y: e.clientY };
    };
    const onMouseUp = () => { isDragging.current = false; };

    // Touch events
    const onTouchStart = (e: TouchEvent) => {
      isDragging.current = true;
      autoRotate.current = false;
      lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!isDragging.current) return;
      e.preventDefault();
      const dx = e.touches[0].clientX - lastPos.current.x;
      const dy = e.touches[0].clientY - lastPos.current.y;
      rotationRef.current.y += dx * 0.005;
      rotationRef.current.x += dy * 0.005;
      rotationRef.current.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, rotationRef.current.x));
      lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };
    const onTouchEnd = () => {
      isDragging.current = false;
      setTimeout(() => { autoRotate.current = true; }, 3000);
    };

    // Click to select visit
    const onClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      const cx = w / 2;
      const cy = h / 2;
      const radius = Math.min(w, h) * 0.42;

      let closest: typeof visits[0] | null = null;
      let minDist = 20;

      visits.forEach(visit => {
        if (!visit.lat || !visit.lng) return;
        const pt = project(visit.lat, visit.lng, radius, cx, cy);
        if (!pt.visible) return;
        const dist = Math.sqrt((mx - pt.x) ** 2 + (my - pt.y) ** 2);
        if (dist < minDist) { minDist = dist; closest = visit; }
      });

      if (closest) onVisitClick(closest);
    };

    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mouseup", onMouseUp);
    canvas.addEventListener("mouseleave", onMouseUp);
    canvas.addEventListener("touchstart", onTouchStart, { passive: false });
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });
    canvas.addEventListener("touchend", onTouchEnd);
    canvas.addEventListener("click", onClick);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("mousedown", onMouseDown);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mouseup", onMouseUp);
      canvas.removeEventListener("mouseleave", onMouseUp);
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("touchend", onTouchEnd);
      canvas.removeEventListener("click", onClick);
    };
  }, [visits, wishlist, colorScheme, isDark, filterMode, onVisitClick]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full cursor-grab active:cursor-grabbing"
      style={{ touchAction: "none" }}
    />
  );
}
