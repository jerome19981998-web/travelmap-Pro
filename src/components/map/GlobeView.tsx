"use client";

import { useEffect, useRef, useState } from "react";
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

interface HoverLabel {
  x: number;
  y: number;
  title: string;
  subtitle?: string;
}

const RADIUS = 1;
const AUTO_ROTATION_SPEED = 0.0014;
const DRAG_ROTATION_SPEED = 0.006;

function getVisitColor(count: number, scheme: string = "emerald"): string {
  const schemes: Record<string, string[]> = {
    emerald: ["#6ee7b7", "#34d399", "#10b981", "#059669", "#047857", "#065f46"],
    sky: ["#7dd3fc", "#38bdf8", "#0ea5e9", "#0284c7", "#0369a1", "#075985"],
    violet: ["#c4b5fd", "#a78bfa", "#8b5cf6", "#7c3aed", "#6d28d9", "#5b21b6"],
    rose: ["#fda4af", "#fb7185", "#f43f5e", "#e11d48", "#be123c", "#9f1239"],
    amber: ["#fde68a", "#fcd34d", "#f59e0b", "#d97706", "#b45309", "#92400e"],
    teal: ["#99f6e4", "#5eead4", "#2dd4bf", "#14b8a6", "#0d9488", "#0f766e"],
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

function safeText(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

function normalizeCountryName(value: unknown): string {
  return safeText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getFeatureCountryCode(feature: any): string | null {
  return feature?.properties?.["ISO3166-1-Alpha-2"]?.toUpperCase() || null;
}

function getFeatureCountryNames(feature: any): string[] {
  const properties = feature?.properties || {};
  return [properties.name, properties.ADMIN, properties.NAME, properties.NAME_EN].filter(Boolean);
}

function buildCountryNameIndex(geojson: any): Record<string, string> {
  const index: Record<string, string> = {};
  geojson?.features?.forEach((feature: any) => {
    const code = getFeatureCountryCode(feature);
    if (!code) return;
    getFeatureCountryNames(feature).forEach((name) => {
      const normalized = normalizeCountryName(name);
      if (normalized) index[normalized] = code;
    });
  });
  Object.entries({
    france: "FR",
    "france metropolitaine": "FR",
    "republique francaise": "FR",
    "french republic": "FR",
  }).forEach(([name, code]) => {
    index[name] = code;
  });
  return index;
}

function getCountryCodeFromRecord(
  item: { country_code: unknown; country_name: unknown },
  countryNameIndex: Record<string, string>
): string | null {
  const code = safeText(item.country_code).trim().toUpperCase();
  if (code && /^[A-Z]{2}$/.test(code)) return code;
  const normalizedName = normalizeCountryName(item.country_name);
  return normalizedName ? countryNameIndex[normalizedName] || null : null;
}

function getStoredCountryKey(item: { country_code: unknown; country_name: unknown }): string | null {
  const code = safeText(item.country_code).trim().toUpperCase();
  if (code && /^[A-Z]{2}$/.test(code)) return code;
  return normalizeCountryName(item.country_name) || null;
}

function getCountryCodeFromCoords(lat: number | null, lng: number | null): string | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const pointLat = lat as number;
  const pointLng = lng as number;
  const boxes = [
    { code: "FR", minLat: 41, maxLat: 51.5, minLng: -5.5, maxLng: 10 },
    { code: "ES", minLat: 35.5, maxLat: 44.5, minLng: -10, maxLng: 4.5 },
    { code: "IT", minLat: 35, maxLat: 48, minLng: 6, maxLng: 19 },
    { code: "GB", minLat: 49.5, maxLat: 61, minLng: -8.8, maxLng: 2.2 },
    { code: "BE", minLat: 49.4, maxLat: 51.7, minLng: 2.4, maxLng: 6.5 },
    { code: "NL", minLat: 50.7, maxLat: 53.8, minLng: 3.2, maxLng: 7.3 },
    { code: "DE", minLat: 47, maxLat: 55.3, minLng: 5.5, maxLng: 15.5 },
  ];
  return boxes.find((box) =>
    pointLat >= box.minLat && pointLat <= box.maxLat && pointLng >= box.minLng && pointLng <= box.maxLng
  )?.code || null;
}

function resolveCountryCode(
  item: { country_code: unknown; country_name: unknown; lat: number | null; lng: number | null },
  countryNameIndex: Record<string, string>
): string | null {
  return getCountryCodeFromRecord(item, countryNameIndex) || getCountryCodeFromCoords(item.lat, item.lng);
}

function getValidCoords(lat: number | null, lng: number | null): [number, number] | null {
  return Number.isFinite(lat) && Number.isFinite(lng) ? [lat as number, lng as number] : null;
}

function latLngToVector(lat: number, lng: number, radius = RADIUS) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return {
    x: -(radius * Math.sin(phi) * Math.cos(theta)),
    y: radius * Math.cos(phi),
    z: radius * Math.sin(phi) * Math.sin(theta),
  };
}

function getGeometryRings(geometry: any): number[][][] {
  if (!geometry) return [];
  if (geometry.type === "Polygon") return geometry.coordinates.map((ring: number[][]) => ring);
  if (geometry.type === "MultiPolygon") return geometry.coordinates.flatMap((polygon: number[][][]) => polygon);
  return [];
}

function getLargestOuterRing(geometry: any): number[][] | null {
  const rings = getGeometryRings(geometry);
  return rings.reduce<number[][] | null>((largest, ring) => {
    if (!largest || ring.length > largest.length) return ring;
    return largest;
  }, null);
}

function getRingCenter(ring: number[][]): { lat: number; lng: number } {
  let lat = 0;
  let lng = 0;
  ring.forEach(([ringLng, ringLat]) => {
    lat += ringLat;
    lng += ringLng;
  });
  return { lat: lat / ring.length, lng: lng / ring.length };
}

export default function GlobeView({ visits, wishlist, colorScheme, isDark, filterMode, onVisitClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<any>(null);
  const frameRef = useRef<number>(0);
  const cleanupRef = useRef<(() => void) | null>(null);
  const [hoverLabel, setHoverLabel] = useState<HoverLabel | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let mounted = true;
    let isDragging = false;
    let isPointerOver = false;
    let pointerMoved = false;
    let previousPointer = { x: 0, y: 0 };

    const init = async () => {
      const THREE = await import("three");
      if (!mounted || !containerRef.current) return;

      const container = containerRef.current;
      const width = Math.max(container.offsetWidth, 1);
      const height = Math.max(container.offsetHeight, 1);

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(isDark ? 0x020617 : 0xeef7ff);

      const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
      camera.position.set(0, 0.08, 3.05);

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(width, height);
      rendererRef.current = renderer;
      container.innerHTML = "";
      container.appendChild(renderer.domElement);

      const globeGroup = new THREE.Group();
      globeGroup.rotation.x = -0.18;
      globeGroup.rotation.y = -0.45;
      scene.add(globeGroup);

      const starGeometry = new THREE.BufferGeometry();
      const starCount = isDark ? 1600 : 650;
      const starPositions = new Float32Array(starCount * 3);
      const starColors = new Float32Array(starCount * 3);
      for (let i = 0; i < starCount; i += 1) {
        const radius = 6 + Math.random() * 10;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        starPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
        starPositions[i * 3 + 1] = radius * Math.cos(phi);
        starPositions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
        const brightness = isDark ? 0.45 + Math.random() * 0.55 : 0.65 + Math.random() * 0.25;
        starColors[i * 3] = brightness;
        starColors[i * 3 + 1] = brightness;
        starColors[i * 3 + 2] = isDark ? brightness : 1;
      }
      starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
      starGeometry.setAttribute("color", new THREE.BufferAttribute(starColors, 3));
      scene.add(new THREE.Points(
        starGeometry,
        new THREE.PointsMaterial({ size: isDark ? 0.018 : 0.012, vertexColors: true, transparent: true, opacity: isDark ? 0.8 : 0.35 })
      ));

      const globeMaterial = new THREE.MeshPhongMaterial({
        color: isDark ? 0x061426 : 0xc7e8ff,
        emissive: isDark ? 0x071a2e : 0x7dd3fc,
        emissiveIntensity: isDark ? 0.35 : 0.1,
        shininess: 24,
        specular: new THREE.Color(isDark ? 0x153d5f : 0xffffff),
      });
      globeGroup.add(new THREE.Mesh(new THREE.SphereGeometry(RADIUS, 96, 96), globeMaterial));

      const gridMaterial = new THREE.MeshBasicMaterial({
        color: isDark ? 0x1f6d8f : 0x2563eb,
        transparent: true,
        opacity: isDark ? 0.1 : 0.08,
        wireframe: true,
      });
      globeGroup.add(new THREE.Mesh(new THREE.SphereGeometry(RADIUS * 1.004, 48, 24), gridMaterial));

      const atmosphereMaterial = new THREE.ShaderMaterial({
        transparent: true,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        uniforms: {
          glowColor: { value: new THREE.Color(isDark ? 0x38bdf8 : 0x0ea5e9) },
        },
        vertexShader: `
          varying vec3 vNormal;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 glowColor;
          varying vec3 vNormal;
          void main() {
            float intensity = pow(0.72 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
            gl_FragColor = vec4(glowColor, intensity * 0.55);
          }
        `,
      });
      globeGroup.add(new THREE.Mesh(new THREE.SphereGeometry(RADIUS * 1.1, 96, 96), atmosphereMaterial));

      scene.add(new THREE.AmbientLight(0xffffff, isDark ? 0.55 : 0.85));
      const keyLight = new THREE.DirectionalLight(0xffffff, isDark ? 1.45 : 1.15);
      keyLight.position.set(3.5, 2.2, 4.5);
      scene.add(keyLight);
      const rimLight = new THREE.DirectionalLight(isDark ? 0x38bdf8 : 0xffffff, isDark ? 0.7 : 0.25);
      rimLight.position.set(-4, 1, -2);
      scene.add(rimLight);

      const geojson = await loadGeo();
      if (!mounted) return;

      const countryNameIndex = buildCountryNameIndex(geojson);
      const countryVisitCounts: Record<string, number> = {};
      const countryVisitLookup: Record<string, VisitWithPhotos> = {};
      visits.forEach((visit) => {
        const code = resolveCountryCode(visit, countryNameIndex);
        const storedKey = getStoredCountryKey(visit);
        if (code) {
          countryVisitCounts[code] = (countryVisitCounts[code] || 0) + 1;
          countryVisitLookup[code] = countryVisitLookup[code] || visit;
        }
        if (storedKey) countryVisitCounts[storedKey] = (countryVisitCounts[storedKey] || 0) + 1;
      });

      const wishlistCodes = new Set(
        wishlist.map((item) => resolveCountryCode(item, countryNameIndex)).filter(Boolean) as string[]
      );
      const visitedCodes = new Set(Object.keys(countryVisitLookup));
      const showCountrySignal = filterMode === "countries" || filterMode === "auto" || filterMode === "wishlist";
      const clickableObjects: any[] = [];
      const hoverObjects: any[] = [];

      const borderMaterial = new THREE.LineBasicMaterial({
        color: isDark ? 0x3b82f6 : 0x1d4ed8,
        transparent: true,
        opacity: isDark ? 0.22 : 0.25,
      });

      geojson.features.forEach((feature: any) => {
        const code = getFeatureCountryCode(feature);
        const visitCount = code ? countryVisitCounts[code] || 0 : 0;
        const isVisited = Boolean(code && visitedCodes.has(code));
        const isWishlist = Boolean(code && wishlistCodes.has(code) && !isVisited);
        const rings = getGeometryRings(feature.geometry);

        rings.forEach((ring) => {
          if (ring.length < 2) return;
          const points = ring.map(([lng, lat]) => {
            const pos = latLngToVector(lat, lng, RADIUS * 1.006);
            return new THREE.Vector3(pos.x, pos.y, pos.z);
          });
          globeGroup.add(new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(points),
            isVisited || isWishlist
              ? new THREE.LineBasicMaterial({
                  color: new THREE.Color(isVisited ? getVisitColor(visitCount || 1, colorScheme) : "#8b5cf6"),
                  transparent: true,
                  opacity: isVisited ? 0.75 : 0.5,
                })
              : borderMaterial
          ));
        });

        if (!code || (!showCountrySignal && !isVisited && !isWishlist)) return;
        if (!isVisited && !isWishlist) return;

        const ring = getLargestOuterRing(feature.geometry);
        if (!ring) return;
        const center = getRingCenter(ring);
        const color = isVisited ? getVisitColor(visitCount || 1, colorScheme) : "#8b5cf6";
        const centerPos = latLngToVector(center.lat, center.lng, RADIUS * 1.035);
        const normal = new THREE.Vector3(centerPos.x, centerPos.y, centerPos.z).normalize();

        const platform = new THREE.Mesh(
          new THREE.CylinderGeometry(isVisited ? 0.035 : 0.026, isVisited ? 0.055 : 0.038, isVisited ? 0.035 : 0.018, 28),
          new THREE.MeshPhongMaterial({
            color: new THREE.Color(color),
            emissive: new THREE.Color(color),
            emissiveIntensity: isVisited ? 0.42 : 0.22,
            transparent: true,
            opacity: isVisited ? 0.72 : 0.42,
          })
        );
        platform.position.set(centerPos.x, centerPos.y, centerPos.z);
        platform.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
        platform.userData = {
          visit: countryVisitLookup[code],
          label: {
            title: getFeatureCountryNames(feature)[0] || code,
            subtitle: isVisited ? `${visitCount} visite${visitCount > 1 ? "s" : ""}` : "Wishlist",
          },
        };
        hoverObjects.push(platform);
        if (isVisited) clickableObjects.push(platform);
        globeGroup.add(platform);
      });

      const routeVisits = visits
        .filter((visit) => getValidCoords(visit.lat, visit.lng))
        .sort((a, b) => {
          const dateA = new Date(a.visited_at || a.created_at || 0).getTime();
          const dateB = new Date(b.visited_at || b.created_at || 0).getTime();
          return dateA - dateB;
        })
        .slice(-60);

      if (routeVisits.length > 1 && filterMode !== "countries" && filterMode !== "wishlist") {
        for (let index = 1; index < routeVisits.length; index += 1) {
          const previous = routeVisits[index - 1];
          const current = routeVisits[index];
          const previousCoords = getValidCoords(previous.lat, previous.lng);
          const currentCoords = getValidCoords(current.lat, current.lng);
          if (!previousCoords || !currentCoords) continue;
          if (previousCoords[0] === currentCoords[0] && previousCoords[1] === currentCoords[1]) continue;

          const start = latLngToVector(previousCoords[0], previousCoords[1], RADIUS * 1.095);
          const end = latLngToVector(currentCoords[0], currentCoords[1], RADIUS * 1.095);
          const startVec = new THREE.Vector3(start.x, start.y, start.z);
          const endVec = new THREE.Vector3(end.x, end.y, end.z);
          const midVec = startVec.clone().add(endVec).multiplyScalar(0.5).normalize().multiplyScalar(RADIUS * 1.32);
          const curve = new THREE.QuadraticBezierCurve3(startVec, midVec, endVec);
          const countryCode = resolveCountryCode(current, countryNameIndex);
          const color = getVisitColor(countryVisitCounts[countryCode || getStoredCountryKey(current) || ""] || 1, colorScheme);

          globeGroup.add(new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(curve.getPoints(36)),
            new THREE.LineBasicMaterial({
              color: new THREE.Color(color),
              transparent: true,
              opacity: isDark ? 0.36 : 0.42,
            })
          ));
        }
      }

      if (filterMode !== "countries") {
        visits.forEach((visit) => {
          const coords = getValidCoords(visit.lat, visit.lng);
          if (!coords) return;
          const [lat, lng] = coords;
          const isNeighborhood = visit.place_type === "neighborhood";
          if (filterMode === "cities" && isNeighborhood) return;
          if (filterMode === "neighborhoods" && !isNeighborhood) return;

          const countryCode = resolveCountryCode(visit, countryNameIndex);
          const storedKey = getStoredCountryKey(visit);
          const count = countryVisitCounts[countryCode || storedKey || ""] || 1;
          const color = getVisitColor(count, colorScheme);
          const position = latLngToVector(lat, lng, RADIUS * 1.08);
          const normal = new THREE.Vector3(position.x, position.y, position.z).normalize();

          const marker = new THREE.Mesh(
            new THREE.SphereGeometry(isNeighborhood ? 0.012 : 0.018, 20, 20),
            new THREE.MeshBasicMaterial({ color: new THREE.Color(color) })
          );
          marker.position.set(position.x, position.y, position.z);
          marker.userData = {
            visit,
            label: {
              title: visit.place_name,
              subtitle: visit.country_name || (isNeighborhood ? "Quartier" : "Ville"),
            },
          };
          clickableObjects.push(marker);
          hoverObjects.push(marker);
          globeGroup.add(marker);

          const beamEnd = latLngToVector(lat, lng, RADIUS * (isNeighborhood ? 1.05 : 1.065));
          globeGroup.add(new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([
              new THREE.Vector3(beamEnd.x, beamEnd.y, beamEnd.z),
              new THREE.Vector3(position.x, position.y, position.z),
            ]),
            new THREE.LineBasicMaterial({ color: new THREE.Color(color), transparent: true, opacity: 0.45 })
          ));

          const halo = new THREE.Mesh(
            new THREE.RingGeometry(isNeighborhood ? 0.018 : 0.026, isNeighborhood ? 0.03 : 0.044, 32),
            new THREE.MeshBasicMaterial({
              color: new THREE.Color(color),
              transparent: true,
              opacity: 0.28,
              side: THREE.DoubleSide,
              blending: THREE.AdditiveBlending,
            })
          );
          halo.position.copy(marker.position);
          halo.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
          globeGroup.add(halo);
        });
      }

      if (filterMode === "wishlist") {
        wishlist.forEach((item) => {
          const coords = getValidCoords(item.lat, item.lng);
          if (!coords) return;
          const [lat, lng] = coords;
          const color = item.priority === "high" ? "#ef4444" : item.priority === "low" ? "#94a3b8" : "#8b5cf6";
          const position = latLngToVector(lat, lng, RADIUS * 1.075);
          const marker = new THREE.Mesh(
            new THREE.OctahedronGeometry(0.02, 0),
            new THREE.MeshBasicMaterial({ color: new THREE.Color(color) })
          );
          marker.position.set(position.x, position.y, position.z);
          marker.userData = {
            label: {
              title: item.place_name,
              subtitle: item.country_name ? `${item.country_name} · Wishlist` : "Wishlist",
            },
          };
          hoverObjects.push(marker);
          globeGroup.add(marker);
        });
      }

      const raycaster = new THREE.Raycaster();
      const pointer = new THREE.Vector2();

      const updatePointer = (event: MouseEvent) => {
        const rect = renderer.domElement.getBoundingClientRect();
        pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      };

      const onPointerDown = (event: PointerEvent) => {
        isDragging = true;
        pointerMoved = false;
        previousPointer = { x: event.clientX, y: event.clientY };
        renderer.domElement.setPointerCapture(event.pointerId);
      };

      const onPointerMove = (event: PointerEvent) => {
        if (!isDragging) {
          updatePointer(event);
          raycaster.setFromCamera(pointer, camera);
          const hovered = raycaster.intersectObjects(hoverObjects, false)[0]?.object?.userData?.label as
            | { title: string; subtitle?: string }
            | undefined;
          setHoverLabel(hovered ? { x: event.clientX, y: event.clientY, title: hovered.title, subtitle: hovered.subtitle } : null);
          return;
        }
        const dx = event.clientX - previousPointer.x;
        const dy = event.clientY - previousPointer.y;
        if (Math.abs(dx) + Math.abs(dy) > 3) pointerMoved = true;
        setHoverLabel(null);
        globeGroup.rotation.y += dx * DRAG_ROTATION_SPEED;
        globeGroup.rotation.x = Math.max(-1.1, Math.min(1.1, globeGroup.rotation.x + dy * DRAG_ROTATION_SPEED * 0.45));
        previousPointer = { x: event.clientX, y: event.clientY };
      };

      const onPointerUp = (event: PointerEvent) => {
        isDragging = false;
        if (renderer.domElement.hasPointerCapture(event.pointerId)) {
          renderer.domElement.releasePointerCapture(event.pointerId);
        }
      };

      const onClick = (event: MouseEvent) => {
        if (isDragging || pointerMoved) return;
        updatePointer(event);
        raycaster.setFromCamera(pointer, camera);
        const intersects = raycaster.intersectObjects(clickableObjects, false);
        const visit = intersects[0]?.object?.userData?.visit as VisitWithPhotos | undefined;
        if (visit) onVisitClick(visit);
      };

      const onPointerEnter = () => {
        isPointerOver = true;
      };

      const onPointerLeave = () => {
        isPointerOver = false;
        isDragging = false;
        setHoverLabel(null);
      };

      const onResize = () => {
        if (!containerRef.current) return;
        const nextWidth = Math.max(containerRef.current.offsetWidth, 1);
        const nextHeight = Math.max(containerRef.current.offsetHeight, 1);
        camera.aspect = nextWidth / nextHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(nextWidth, nextHeight);
      };

      renderer.domElement.addEventListener("pointerdown", onPointerDown);
      renderer.domElement.addEventListener("pointermove", onPointerMove);
      renderer.domElement.addEventListener("pointerup", onPointerUp);
      renderer.domElement.addEventListener("pointercancel", onPointerUp);
      renderer.domElement.addEventListener("mouseenter", onPointerEnter);
      renderer.domElement.addEventListener("mouseleave", onPointerLeave);
      renderer.domElement.addEventListener("click", onClick);
      window.addEventListener("resize", onResize);

      const animate = () => {
        frameRef.current = requestAnimationFrame(animate);
        if (!isDragging && !isPointerOver) globeGroup.rotation.y += AUTO_ROTATION_SPEED;
        renderer.render(scene, camera);
      };
      animate();

      cleanupRef.current = () => {
        renderer.domElement.removeEventListener("pointerdown", onPointerDown);
        renderer.domElement.removeEventListener("pointermove", onPointerMove);
        renderer.domElement.removeEventListener("pointerup", onPointerUp);
        renderer.domElement.removeEventListener("pointercancel", onPointerUp);
        renderer.domElement.removeEventListener("mouseenter", onPointerEnter);
        renderer.domElement.removeEventListener("mouseleave", onPointerLeave);
        renderer.domElement.removeEventListener("click", onClick);
        window.removeEventListener("resize", onResize);
      };
    };

    init();

    return () => {
      mounted = false;
      cleanupRef.current?.();
      cleanupRef.current = null;
      cancelAnimationFrame(frameRef.current);
      rendererRef.current?.dispose();
      rendererRef.current = null;
      if (containerRef.current) containerRef.current.innerHTML = "";
    };
  }, [visits, wishlist, colorScheme, isDark, filterMode, onVisitClick]);

  return (
    <div className="relative w-full h-full">
      <div
        ref={containerRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        style={{
          background: isDark
            ? "radial-gradient(circle at 50% 45%, #0f2a3d 0%, #07111f 42%, #020617 100%)"
            : "radial-gradient(circle at 50% 45%, #dff6ff 0%, #eef7ff 52%, #dbeafe 100%)",
        }}
      />
      {hoverLabel && (
        <div
          className="pointer-events-none fixed z-[10000] rounded-lg border border-white/10 bg-slate-950/85 px-3 py-2 shadow-2xl backdrop-blur text-left"
          style={{ left: hoverLabel.x + 14, top: hoverLabel.y + 14 }}
        >
          <div className="text-xs font-semibold text-white">{hoverLabel.title}</div>
          {hoverLabel.subtitle && <div className="mt-0.5 text-[10px] text-slate-300">{hoverLabel.subtitle}</div>}
        </div>
      )}
    </div>
  );
}
