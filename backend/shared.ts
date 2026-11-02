export function coordinates(lat: unknown, lng: unknown) {
  const a = Number(lat),
    b = Number(lng);
  if (
    !Number.isFinite(a) ||
    !Number.isFinite(b) ||
    a < 31.2 ||
    a > 31.8 ||
    b < 74 ||
    b > 74.7
  )
    throw new Error("Choose coordinates within the Lahore study area.");
  return { lat: a, lng: b };
}
export function radius(value: unknown) {
  const n = value === undefined ? 10000 : Number(value);
  if (!Number.isInteger(n) || n < 1000 || n > 25000)
    throw new Error("Radius must be 1000–25000 metres.");
  return n;
}
export function seconds(value: unknown): number | null {
  if (typeof value !== "string" || !/^\d+(\.\d+)?s$/.test(value)) return null;
  return Number(value.slice(0, -1));
}
export function parseMatrix(data: unknown, ids: string[]) {
  if (!Array.isArray(data)) throw new Error("Invalid route matrix response");
  return ids.map((facilityId, i) => {
    const r = data.find((r) => r.destinationIndex === i && r.originIndex === 0);
    if (!r || r.status?.code || r.condition !== "ROUTE_EXISTS")
      return {
        facilityId,
        durationSec: null,
        staticSec: null,
        distanceMeters: null,
        error: r?.status?.message || "No route returned",
      };
    return {
      facilityId,
      durationSec: seconds(r.duration),
      staticSec: seconds(r.staticDuration),
      distanceMeters:
        typeof r.distanceMeters === "number" ? r.distanceMeters : null,
    };
  });
}
