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
      const RADIUS = 1;
      const globeGeo = new THREE.SphereGeometry(RADIUS, 64, 64);
      const globeMat = new THREE.MeshPhongMaterial({
        color: isDark ? 0x0f2744 : 0x93c5fd,
        shininess: 15,
        specular: new THREE.Color(0x333333),
      });
      const globe = new THREE.Mesh(globeGeo, globeMat);
      scene.add(globe);

      // Atmosphere glow
      const atmosGeo = new THREE.SphereGeometry(RADIUS * 1.02, 64, 64);
      const atmosMat = new THREE.MeshPhongMaterial({
        color: isDark ? 0x1a6fba : 0x60a5fa,
        transparent: true,
        opacity: 0.08,
        side: THREE.FrontSide,
      });
      scene.add(new THREE.Mesh(atmosGeo, atmosMat));

      // Lights
      const ambientLight = new THREE.AmbientLight(0xffffff, isDark ? 0.4 : 0.8);
      scene.add(ambientLight);
      const sunLight = new THREE.DirectionalLight(0xffffff, isDark ? 0.8 : 1.2);
      sunLight.position.set(5, 3, 5);
      scene.add(sunLight);

      // Load GeoJSON and draw countries
      const geojson = await loadGeo();
      if (!mounted) return;

      const countryVisitCounts: Record<string, number> = {};
      visits.forEach(v => {
        if (v.country_code) {
          const code = v.country_code.toUpperCase();
          countryVisitCounts[code] = (countryVisitCounts[code] || 0) + 1;
        }
      });
      const visitedCodes = new Set(Object.keys(countryVisitCounts));
      const wishlistCodes = new Set(wishlist.map(w => w.country_code?.toUpperCase()).filter(Boolean) as string[]);

      const showCountryFills = filterMode === "all" || filterMode === "countries";

      // Draw country borders + fills
      geojson.features.forEach((feature: any) => {
        const code = feature.properties?.["ISO3166-1-Alpha-2"]?.toUpperCase();
        const isVisited = visitedCodes.has(code);
        const isWishlist = wishlistCodes.has(code) && !isVisited;

        if (!showCountryFills && !isVisited && !isWishlist) return;

        const getCoords = (geometry: any): number[][][] => {
          if (geometry.type === "Polygon") return [geometry.coordinates[0]];
          if (geometry.type === "MultiPolygon") return geometry.coordinates.map((p: any) => p[0]);
          return [];
        };

        const polys = getCoords(feature.geometry);

        polys.forEach((ring: number[][]) => {
          // Border line
          const points: any[] = [];
          ring.forEach(([lng, lat]) => {
            const v3 = latLngToVec3(lat, lng, RADIUS * 1.001);
            points.push(new THREE.Vector3(v3.x, v3.y, v3.z));
          });

          const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
          const lineColor = isVisited
            ? getVisitColor(countryVisitCounts[code] || 1, colorScheme)
            : isWishlist ? "#8b5cf6"
            : isDark ? "#1e3a5f" : "#93c5fd";

          const rgb = hexToRgb(lineColor);
          const lineMat = new THREE.LineBasicMaterial({
            color: new THREE.Color(rgb.r, rgb.g, rgb.b),
            opacity: isVisited ? 0.9 : isWishlist ? 0.6 : 0.2,
            transparent: true,
          });
          scene.add(new THREE.Line(lineGeo, lineMat));

          // Fill for visited/wishlist
          if (isVisited || isWishlist) {
            const fillColor = isVisited
              ? getVisitColor(countryVisitCounts[code] || 1, colorScheme)
              : "#8b5cf6";
            const rgb2 = hexToRgb(fillColor);

            const shape = new THREE.Shape();
            ring.forEach(([lng, lat], i) => {
              const v3 = latLngToVec3(lat, lng, RADIUS * 1.002);
              if (i === 0) shape.moveTo(v3.x, v3.y);
              else shape.lineTo(v3.x, v3.y);
            });

            // Simple approach: use point markers per polygon center
            let sumLat = 0, sumLng = 0;
            ring.forEach(([lng, lat]) => { sumLat += lat; sumLng += lng; });
            const centerLat = sumLat / ring.length;
            const centerLng = sumLng / ring.length;

            const center = latLngToVec3(centerLat, centerLng, RADIUS * 1.003);
            const dotGeo = new THREE.SphereGeometry(0.012, 8, 8);
            const dotMat = new THREE.MeshBasicMaterial({
              color: new THREE.Color(rgb2.r, rgb2.g, rgb2.b),
              transparent: true,
              opacity: isVisited ? 0.9 : 0.5,
            });
            const dot = new THREE.Mesh(dotGeo, dotMat);
            dot.position.set(center.x, center.y, center.z);
            scene.add(dot);
          }
        });
      });

      // Visit point markers
      if (filterMode !== "wishlist" && filterMode !== "countries") {
        visits.forEach(visit => {
          if (!visit.lat || !visit.lng) return;
          const type = visit.place_type;
          if (filterMode === "cities" && type === "neighborhood") return;
          if (filterMode === "neighborhoods" && type !== "neighborhood") return;

          const count = countryVisitCounts[visit.country_code?.toUpperCase() || ""] || 1;
          const color = getVisitColor(count, colorScheme);
          const rgb = hexToRgb(color);

          const pos = latLngToVec3(visit.lat, visit.lng, RADIUS * 1.015);
          const size = type === "neighborhood" ? 0.008 : 0.015;
          const geo = new THREE.SphereGeometry(size, 8, 8);
          const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(rgb.r, rgb.g, rgb.b) });
          const mesh = new THREE.Mesh(geo, mat);
          mesh.position.set(pos.x, pos.y, pos.z);
          mesh.userData = { visit };
          scene.add(mesh);

          // Glow ring
          const glowGeo = new THREE.RingGeometry(size * 1.5, size * 2.5, 16);
          const glowMat = new THREE.MeshBasicMaterial({
            color: new THREE.Color(rgb.r, rgb.g, rgb.b),
            transparent: true, opacity: 0.4, side: THREE.DoubleSide,
          });
          const glow = new THREE.Mesh(glowGeo, glowMat);
          glow.position.set(pos.x, pos.y, pos.z);
          glow.lookAt(0, 0, 0);
          scene.add(glow);
        });
      }

      // Wishlist markers
      if (filterMode === "all" || filterMode === "wishlist") {
        wishlist.forEach(item => {
          if (!item.lat || !item.lng) return;
          const pc = item.priority === "high" ? "#ef4444" : item.priority === "low" ? "#6b7280" : "#8b5cf6";
          const rgb = hexToRgb(pc);
          const pos = latLngToVec3(item.lat, item.lng, RADIUS * 1.015);
          const geo = new THREE.SphereGeometry(0.012, 8, 8);
          const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(rgb.r, rgb.g, rgb.b) });
          const mesh = new THREE.Mesh(geo, mat);
          mesh.position.set(pos.x, pos.y, pos.z);
          scene.add(mesh);
        });
      }

      // Mouse controls
      let isDragging = false;
      let prevMouse = { x: 0, y: 0 };
      const rotationSpeed = 0.005;
      let autoRotate = true;

      const onMouseDown = (e: MouseEvent) => { isDragging = true; autoRotate = false; prevMouse = { x: e.clientX, y: e.clientY }; };
      const onMouseMove = (e: MouseEvent) => {
        if (!isDragging) return;
        const dx = e.clientX - prevMouse.x;
        const dy = e.clientY - prevMouse.y;
        globe.rotation.y += dx * rotationSpeed;
        globe.rotation.x += dy * rotationSpeed * 0.5;
        scene.children.forEach(child => {
          if (child !== globe && !(child instanceof THREE.Points)) {
            child.rotation.y += dx * rotationSpeed;
            child.rotation.x += dy * rotationSpeed * 0.5;
          }
        });
        prevMouse = { x: e.clientX, y: e.clientY };
      };
      const onMouseUp = () => { isDragging = false; };

      const onTouchStart = (e: TouchEvent) => { isDragging = true; autoRotate = false; prevMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY }; };
      const onTouchMove = (e: TouchEvent) => {
        if (!isDragging) return;
        e.preventDefault();
        const dx = e.touches[0].clientX - prevMouse.x;
        const dy = e.touches[0].clientY - prevMouse.y;
        scene.children.forEach(child => {
          if (!(child instanceof THREE.Points)) {
            child.rotation.y += dx * rotationSpeed;
            child.rotation.x += dy * rotationSpeed * 0.5;
          }
        });
        prevMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      };
      const onTouchEnd = () => { isDragging = false; setTimeout(() => { autoRotate = true; }, 3000); };

      // Click detection
      const raycaster = new THREE.Raycaster();
      const mouse = new THREE.Vector2();
      const onClickGlobe = (e: MouseEvent) => {
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        const meshes = scene.children.filter((c: any) => c.isMesh && c.userData?.visit);
        const intersects = raycaster.intersectObjects(meshes);
        if (intersects.length > 0) {
          const visit = intersects[0].object.userData.visit;
          if (visit) onVisitClick(visit);
        }
      };

      renderer.domElement.addEventListener("mousedown", onMouseDown);
      renderer.domElement.addEventListener("mousemove", onMouseMove);
      renderer.domElement.addEventListener("mouseup", onMouseUp);
      renderer.domElement.addEventListener("mouseleave", onMouseUp);
      renderer.domElement.addEventListener("touchstart", onTouchStart, { passive: false });
      renderer.domElement.addEventListener("touchmove", onTouchMove, { passive: false });
      renderer.domElement.addEventListener("touchend", onTouchEnd);
      renderer.domElement.addEventListener("click", onClickGlobe);

      // Resize
      const onResize = () => {
        if (!containerRef.current) return;
        const w = containerRef.current.offsetWidth;
        const h = containerRef.current.offsetHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      };
      window.addEventListener("resize", onResize);

      // Animation loop
      const animate = () => {
        animRef.current = requestAnimationFrame(animate);
        if (autoRotate && !isDragging) {
          const rotY = 0.002;
          scene.children.forEach(child => {
            if (!(child instanceof THREE.Points)) {
              child.rotation.y += rotY;
            }
          });
        }
        renderer.render(scene, camera);
      };
      animate();

      return () => {
        renderer.domElement.removeEventListener("mousedown", onMouseDown);
        renderer.domElement.removeEventListener("mousemove", onMouseMove);
        renderer.domElement.removeEventListener("mouseup", onMouseUp);
        renderer.domElement.removeEventListener("mouseleave", onMouseUp);
        renderer.domElement.removeEventListener("touchstart", onTouchStart);
        renderer.domElement.removeEventListener("touchmove", onTouchMove);
        renderer.domElement.removeEventListener("touchend", onTouchEnd);
        renderer.domElement.removeEventListener("click", onClickGlobe);
        window.removeEventListener("resize", onResize);
      };
    };

    init();

    return () => {
      mounted = false;
      cancelAnimationFrame(animRef.current);
      if (rendererRef.current) {
        rendererRef.current.dispose();
        rendererRef.current = null;
      }
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [visits, wishlist, colorScheme, isDark, filterMode, onVisitClick]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ background: isDark ? "#050a14" : "#f0f9ff" }}
    />
  );
}
