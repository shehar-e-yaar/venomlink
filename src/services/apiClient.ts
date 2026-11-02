import type {
  Dataset,
  DiscoveredPlace,
  LiveRoute,
  MatrixItem,
  Origin,
} from "../types";
export const API = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") || "";
export const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY || "";
export const MAPS_DEMO = import.meta.env.VITE_GOOGLE_MAPS_DEMO_MODE === "true";
export const REFRESH_MS = Math.max(
  60000,
  Number(import.meta.env.VITE_ROUTE_REFRESH_MS) || 300000,
);
async function request<T>(
  path: string,
  options: RequestInit = {},
  signal?: AbortSignal,
): Promise<T> {
  if (!API)
    throw new Error(
      "Live backend is not configured. Demo exploration remains available.",
    );
  const r = await fetch(API + path, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
    signal: AbortSignal.any([
      signal || new AbortController().signal,
      AbortSignal.timeout(15000),
    ]),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || `Service unavailable (${r.status})`);
  return d;
}
export const getFacilities = (signal?: AbortSignal) =>
  request<
    Dataset & { delivery: { service: string; bucket: string; key: string } }
  >("/facilities", {}, signal);
export const discover = (
  o: Origin,
  radius: number,
  text?: string,
  signal?: AbortSignal,
) =>
  request<{
    places: DiscoveredPlace[];
    searchedAt: string;
    attribution: string;
    radius: number;
  }>(
    `/aws/${text ? "search" : "nearby"}?lat=${o.lat}&lng=${o.lng}&radius=${radius}${text ? `&text=${encodeURIComponent(text)}` : ""}`,
    {},
    signal,
  );
export const routeMatrix = (
  origin: Origin,
  facilityIds: string[],
  signal?: AbortSignal,
) =>
  request<{ items: MatrixItem[]; calculatedAt: string; method?: string }>(
    "/routes/matrix",
    {
      method: "POST",
      body: JSON.stringify({
        origin: { lat: origin.lat, lng: origin.lng },
        facilityIds,
      }),
    },
    signal,
  );
export const selectedRoute = (
  origin: Origin,
  facilityId: string,
  signal?: AbortSignal,
) =>
  request<LiveRoute>(
    "/routes/selected",
    {
      method: "POST",
      body: JSON.stringify({
        origin: { lat: origin.lat, lng: origin.lng },
        facilityId,
      }),
    },
    signal,
  );
export function validDataset(d: Dataset) {
  if (!Array.isArray(d.facilities) || !d.facilities.length)
    throw new Error("Facility dataset is empty");
  const ids = new Set();
  for (const f of d.facilities) {
    if (
      !f.id ||
      ids.has(f.id) ||
      !f.name ||
      !Number.isFinite(f.lat) ||
      !Number.isFinite(f.lng) ||
      f.lat < 31.2 ||
      f.lat > 31.8 ||
      f.lng < 74 ||
      f.lng > 74.7 ||
      !["human-hospital", "reference"].includes(f.kind) ||
      !["unknown", "confirmed", "not-human-care"].includes(f.clinicalStatus) ||
      !/^https:\/\//.test(f.sourceUrl) ||
      !/^https:\/\//.test(f.coordinateSource)
    )
      throw new Error("Invalid facility dataset");
    ids.add(f.id);
  }
  return d;
}
