import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MAPS_KEY } from "../services/apiClient";
import { decodePolyline } from "../services/accessibilityService";
import type {
  Coverage,
  Facility,
  LiveRoute,
  Origin,
  PlanningJourney,
} from "../types";
export type MapMode = "loading" | "google" | "demo";
let mapsPromise: Promise<void> | null = null;
function loadGoogle() {
  if (window.google?.maps?.Map) return Promise.resolve();
  if (mapsPromise) return mapsPromise;
  mapsPromise = new Promise<void>((resolve, reject) => {
    const w = window as unknown as Record<string, unknown>;
    w.venomlinkMapsReady = () => resolve();
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(MAPS_KEY)}&v=weekly&loading=async&libraries=marker&callback=venomlinkMapsReady`;
    script.async = true;
    script.onerror = () => {
      mapsPromise = null;
      reject(new Error("Map script unavailable"));
    };
    document.head.appendChild(script);
  });
  return mapsPromise;
}
const markerHtml = (label: string, kind: string) => {
  const e = document.createElement("div");
  e.className = `pin ${kind}`;
  e.textContent = label;
  return e;
};
export function LiveTrafficMap({
  facilities,
  origin,
  selected,
  onSelect,
  onOrigin,
  traffic,
  journey,
  liveRoute,
  coverage,
  showZones,
  onMode,
  focusToken,
}: {
  facilities: Facility[];
  origin: Origin;
  selected: Facility | null;
  onSelect: (f: Facility) => void;
  onOrigin: (p: { lat: number; lng: number }) => void;
  traffic: boolean;
  journey: PlanningJourney | null;
  liveRoute: LiveRoute | null;
  coverage: Coverage;
  showZones: boolean;
  onMode: (mode: MapMode) => void;
  focusToken: number;
}) {
  const host = useRef<HTMLDivElement>(null),
    gmap = useRef<google.maps.Map | null>(null),
    lmap = useRef<L.Map | null>(null),
    trafficLayer = useRef<google.maps.TrafficLayer | null>(null),
    [mode, setMode] = useState<MapMode>("loading"),
    [reason, setReason] = useState("");
  const refs = useRef({ onOrigin, onMode });
  refs.current = { onOrigin, onMode };
  const markers = useRef<google.maps.marker.AdvancedMarkerElement[]>([]),
    polys = useRef<(google.maps.Polyline | google.maps.Circle)[]>([]),
    localLayer = useRef<L.LayerGroup | null>(null);
  useEffect(() => {
    let disposed = false;
    const change = (m: MapMode) => {
      setMode(m);
      refs.current.onMode(m);
    };
    const fallback = () => {
      if (disposed || !host.current || lmap.current) return;
      gmap.current = null;
      host.current.replaceChildren();
      const m = L.map(host.current, {
        zoomControl: false,
        scrollWheelZoom: false,
      }).setView([31.555, 74.32], 11);
      lmap.current = m;
      L.control.zoom({ position: "bottomright" }).addTo(m);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(m);
      localLayer.current = L.layerGroup().addTo(m);
      m.on("click", (e) => refs.current.onOrigin(e.latlng));
      change("demo");
    };
    const init = async () => {
      if (!MAPS_KEY) {
        setReason("Google Maps key not configured");
        fallback();
        return;
      }
      try {
        await Promise.race([
          loadGoogle(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Map timed out")), 12000),
          ),
        ]);
        if (disposed || !host.current) return;
        const m = new google.maps.Map(host.current, {
          center: { lat: 31.555, lng: 74.32 },
          zoom: 11,
          mapId: import.meta.env.VITE_GOOGLE_MAP_ID || "DEMO_MAP_ID",
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          gestureHandling: "cooperative",
        });
        gmap.current = m;
        trafficLayer.current = new google.maps.TrafficLayer();
        m.addListener("click", (e: google.maps.MapMouseEvent) => {
          if (e.latLng) refs.current.onOrigin(e.latLng.toJSON());
        });
        change("google");
      } catch {
        setReason("Google Maps unavailable");
        fallback();
      }
    };
    const authFailure = () => {
      setReason("Google authorization or billing unavailable");
      fallback();
    };
    (window as unknown as Record<string, unknown>).gm_authFailure = authFailure;
    void init();
    const ro = new ResizeObserver(() => lmap.current?.invalidateSize());
    if (host.current) ro.observe(host.current);
    return () => {
      disposed = true;
      ro.disconnect();
      markers.current.forEach((m) => (m.map = null));
      polys.current.forEach((p) => p.setMap(null));
      lmap.current?.remove();
      lmap.current = null;
      gmap.current = null;
    };
  }, []);
  useEffect(() => {
    trafficLayer.current?.setMap(
      mode === "google" && traffic ? gmap.current : null,
    );
  }, [traffic, mode]);
  useEffect(() => {
    if (mode === "google" && gmap.current) {
      markers.current.forEach((m) => (m.map = null));
      markers.current = [];
      for (const f of facilities) {
        const m = new google.maps.marker.AdvancedMarkerElement({
          map: gmap.current,
          position: f,
          content: markerHtml(
            f.kind === "reference" ? "R" : "+",
            selected?.id === f.id
              ? "chosen"
              : f.kind === "reference"
                ? "reference"
                : "facility",
          ),
          title: f.name,
        });
        m.addListener("click", () => onSelect(f));
        markers.current.push(m);
      }
      markers.current.push(
        new google.maps.marker.AdvancedMarkerElement({
          map: gmap.current,
          position: origin,
          content: markerHtml("•", "origin"),
          title: "Selected origin",
        }),
      );
    }
    if (mode === "demo" && localLayer.current) {
      localLayer.current.clearLayers();
      for (const f of facilities)
        L.marker([f.lat, f.lng], {
          icon: L.divIcon({
            className: "map-pin-wrapper",
            html: markerHtml(
              f.kind === "reference" ? "R" : "+",
              selected?.id === f.id
                ? "chosen"
                : f.kind === "reference"
                  ? "reference"
                  : "facility",
            ).outerHTML,
            iconSize: [31, 31],
            iconAnchor: [15, 15],
          }),
        })
          .addTo(localLayer.current)
          .bindTooltip(f.name, { direction: "top" })
          .on("click", () => onSelect(f));
      L.marker([origin.lat, origin.lng], {
        icon: L.divIcon({
          className: "map-pin-wrapper",
          html: markerHtml("•", "origin").outerHTML,
          iconSize: [31, 31],
          iconAnchor: [15, 15],
        }),
      })
        .addTo(localLayer.current)
        .bindTooltip("Origin: " + origin.name);
      if (journey?.available)
        L.polyline(
          journey.path.map((p) => [p.lat, p.lng] as [number, number]),
          { color: "#cc9b23", weight: 4, dashArray: "7 8", opacity: 0.9 },
        ).addTo(localLayer.current);
      if (showZones)
        for (const r of coverage.rows)
          L.circleMarker([r.community.lat, r.community.lng], {
            radius: 22,
            color: r.covered ? "#849a76" : "#d1a147",
            fillColor: r.covered ? "#c9dabc" : "#f4d68f",
            fillOpacity: 0.28,
            weight: 1,
          })
            .addTo(localLayer.current)
            .bindTooltip(
              r.community.name +
                (r.covered
                  ? " · within modeled threshold"
                  : " · outside modeled threshold"),
            );
    }
  }, [
    mode,
    facilities,
    origin,
    selected,
    journey,
    coverage,
    showZones,
    onSelect,
  ]);
  useEffect(() => {
    polys.current.forEach((p) => p.setMap(null));
    polys.current = [];
    if (mode !== "google" || !gmap.current) return;
    const m = gmap.current;
    if (liveRoute) {
      try {
        const path = decodePolyline(liveRoute.encodedPolyline);
        polys.current.push(
          new google.maps.Polyline({
            map: m,
            path,
            strokeColor: "#d2a32f",
            strokeWeight: 5,
            strokeOpacity: 0.9,
          }),
        );
        for (const interval of liveRoute.intervals) {
          const start = interval.startPolylinePointIndex || 0;
          const end = interval.endPolylinePointIndex;
          if (start < 0 || end >= path.length || end <= start) continue;
          polys.current.push(
            new google.maps.Polyline({
              map: m,
              path: path.slice(start, end + 1),
              strokeColor:
                interval.speed === "TRAFFIC_JAM"
                  ? "#b94d42"
                  : interval.speed === "SLOW"
                    ? "#e6a040"
                    : "#689581",
              strokeWeight: 5,
              strokeOpacity: 1,
            }),
          );
        }
      } catch {
        /* Invalid provider geometry is never replaced with fake road data. */
      }
    } else if (journey?.available)
      polys.current.push(
        new google.maps.Polyline({
          map: m,
          path: journey.path,
          strokeColor: "#c4a04f",
          strokeWeight: 3,
          strokeOpacity: 0.7,
          icons: [
            {
              icon: { path: "M 0,-1 0,1", strokeOpacity: 1, scale: 3 },
              offset: "0",
              repeat: "16px",
            },
          ],
        }),
      );
    if (showZones)
      for (const r of coverage.rows)
        polys.current.push(
          new google.maps.Circle({
            map: m,
            center: r.community,
            radius: 500,
            strokeWeight: 1,
            strokeColor: r.covered ? "#839a76" : "#caa24d",
            fillColor: r.covered ? "#c9dabc" : "#f4d68f",
            fillOpacity: 0.25,
          }),
        );
  }, [mode, liveRoute, journey, showZones, coverage]);
  useEffect(() => {
    const target = selected || origin;
    if (mode === "google") gmap.current?.panTo(target);
    if (mode === "demo")
      lmap.current?.flyTo([target.lat, target.lng], selected ? 12 : 11, {
        duration: 0.7,
      });
  }, [focusToken, mode]);
  return (
    <div className="map-wrapper">
      <div ref={host} className="map-canvas" data-testid="care-map" />
      <div className={`map-mode ${mode === "google" ? "real" : ""}`}>
        {mode === "google"
          ? "Google Maps · routing estimates separate"
          : mode === "loading"
            ? "Loading geographic view…"
            : `Demo map · ${reason}`}
      </div>
      <div className="map-bottom-label">
        {liveRoute && mode === "google"
          ? "Google Maps traffic-aware route"
          : journey?.available
            ? "Illustrative planning path · not navigation"
            : "Click the map to choose an origin"}
      </div>
    </div>
  );
}
