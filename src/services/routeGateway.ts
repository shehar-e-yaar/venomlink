import { MAPS_DEMO, MAPS_KEY, routeMatrix, selectedRoute } from "./apiClient";
import type { Facility, LiveRoute, Origin } from "../types";
let useBrowserDemo = false;
let blockedUntil = 0;
const quotaMessage =
  "Google demo route limit reached. Open Google Maps for directions or try after reset.";
let queue: Promise<unknown> = Promise.resolve();
const recent = new Map<string, { at: number; value: LiveRoute }>();
const quotaError = (error: unknown) =>
  /quota|429/i.test((error as Error)?.message || "");
async function browserRoute(
  origin: Origin,
  facility: Facility,
  signal: AbortSignal,
): Promise<LiveRoute> {
  const cacheKey = `${origin.lat},${origin.lng}:${facility.id}`;
  const cached = recent.get(cacheKey);
  if (cached && Date.now() - cached.at < 300000) return cached.value;
  const work = queue
    .catch(() => {})
    .then(async () => {
      signal.throwIfAborted();
      if (Date.now() < blockedUntil) throw new Error(quotaMessage);
      const cachedAgain = recent.get(cacheKey);
      if (cachedAgain && Date.now() - cachedAgain.at < 300000)
        return cachedAgain.value;
      await new Promise((resolve) => setTimeout(resolve, 400));
      signal.throwIfAborted();
      const waypoint = (p: { lat: number; lng: number }) => ({
        location: { latLng: { latitude: p.lat, longitude: p.lng } },
      });
      const response = await fetch(
        "https://routes.googleapis.com/directions/v2:computeRoutes",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": MAPS_KEY,
            "X-Goog-FieldMask":
              "routes.duration,routes.staticDuration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.travelAdvisory.speedReadingIntervals",
          },
          body: JSON.stringify({
            origin: waypoint(origin),
            destination: waypoint(facility),
            travelMode: "DRIVE",
            routingPreference: "TRAFFIC_AWARE",
            extraComputations: ["TRAFFIC_ON_POLYLINE"],
            polylineQuality: "HIGH_QUALITY",
          }),
          signal,
        },
      );
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 429) {
          const metadata = data.error?.details?.find(
            (d: { metadata?: { quota_limit?: string } }) =>
              d.metadata?.quota_limit === "ComputeRoutesRequestsPerDay",
          )?.metadata;
          blockedUntil = metadata?.window_start_time
            ? Math.max(
                Date.now() + 60000,
                Number(metadata.window_start_time) * 1000 + 86400000,
              )
            : Date.now() + 60000;
          throw new Error(quotaMessage);
        }
        throw new Error(
          data.error?.message || "Google driving route unavailable.",
        );
      }
      const r = data.routes?.[0];
      const seconds = (v: unknown) =>
        typeof v === "string" && /^\d+(\.\d+)?s$/.test(v)
          ? Number(v.slice(0, -1))
          : null;
      const duration = seconds(r?.duration);
      if (
        duration === null ||
        !Number.isFinite(r?.distanceMeters) ||
        r.distanceMeters < 0 ||
        !r.polyline?.encodedPolyline
      )
        throw new Error("No usable driving route returned.");
      const value: LiveRoute = {
        durationSec: duration,
        staticSec: seconds(r.staticDuration),
        distanceMeters: r.distanceMeters,
        encodedPolyline: r.polyline.encodedPolyline,
        intervals: r.travelAdvisory?.speedReadingIntervals || [],
        calculatedAt: new Date().toISOString(),
      };
      recent.set(cacheKey, { at: Date.now(), value });
      return value;
    });
  queue = work;
  return work;
}
export async function getSelectedRoute(
  origin: Origin,
  facility: Facility,
  signal: AbortSignal,
) {
  if (!useBrowserDemo) {
    try {
      return await selectedRoute(origin, facility.id, signal);
    } catch (error) {
      if (signal.aborted || !MAPS_DEMO || !MAPS_KEY || !quotaError(error))
        throw error;
      useBrowserDemo = true;
    }
  }
  return browserRoute(origin, facility, signal);
}
export async function compareRoutes(
  origin: Origin,
  facilities: Facility[],
  signal: AbortSignal,
) {
  if (!useBrowserDemo) {
    try {
      const data = await routeMatrix(
        origin,
        facilities.map((f) => f.id),
        signal,
      );
      if (
        !MAPS_DEMO ||
        !MAPS_KEY ||
        !data.items.some((i) => i.error && quotaError(new Error(i.error)))
      )
        return data;
      useBrowserDemo = true;
    } catch (error) {
      if (signal.aborted || !MAPS_DEMO || !MAPS_KEY || !quotaError(error))
        throw error;
      useBrowserDemo = true;
    }
  }
  const items = [];
  for (const f of facilities) {
    try {
      const r = await browserRoute(origin, f, signal);
      items.push({
        facilityId: f.id,
        durationSec: r.durationSec,
        staticSec: r.staticSec,
        distanceMeters: r.distanceMeters,
      });
    } catch (error) {
      if (signal.aborted) throw error;
      items.push({
        facilityId: f.id,
        durationSec: null,
        staticSec: null,
        distanceMeters: null,
        error: (error as Error).message,
      });
    }
  }
  return { items, calculatedAt: new Date().toISOString() };
}
