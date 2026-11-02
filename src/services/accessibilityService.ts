import type {
  Coverage,
  Facility,
  LatLng,
  Origin,
  PlanningJourney,
  Scenario,
} from "../types";
export const BRIDGE: LatLng = { lat: 31.604, lng: 74.291 };
export const ASSUMPTIONS = {
  speedKmh: 20,
  detourFactor: 1.35,
  accessMinutes: 4,
  crossingDelay: 20,
};
export function haversine(a: LatLng, b: LatLng) {
  const r = Math.PI / 180,
    x =
      Math.sin(((b.lat - a.lat) * r) / 2) ** 2 +
      Math.cos(a.lat * r) *
        Math.cos(b.lat * r) *
        Math.sin(((b.lng - a.lng) * r) / 2) ** 2;
  return 12742 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}
export function eligible(f: Facility, s: Scenario) {
  return (
    f.kind === "human-hospital" &&
    (f.planningEligible || (s.upgrade && f.id === "shahdara-thq"))
  );
}
export function planJourney(
  o: Origin,
  f: Facility,
  s: Scenario,
): PlanningJourney {
  const crosses = o.side !== f.side;
  const path = crosses ? [o, BRIDGE, f] : [o, f];
  const distanceKm =
    path.slice(1).reduce((sum, p, i) => sum + haversine(path[i], p), 0) *
    ASSUMPTIONS.detourFactor;
  return {
    facilityId: f.id,
    distanceKm,
    crosses,
    path,
    available: !(crosses && s.closure),
    minutes:
      (distanceKm / ASSUMPTIONS.speedKmh) * 60 +
      ASSUMPTIONS.accessMinutes +
      (crosses && s.delay ? 20 : 0),
  };
}
export function coverage(
  communities: Origin[],
  facilities: Facility[],
  s: Scenario,
): Coverage {
  const baseline = { ...s, delay: false, closure: false, upgrade: false };
  const best = (o: Origin, mode: Scenario) => {
    const journeys = facilities
      .filter((f) => eligible(f, mode))
      .map((f) => planJourney(o, f, mode))
      .filter((j) => j.available);
    return journeys.length ? Math.min(...journeys.map((j) => j.minutes)) : null;
  };
  const rows = communities.map((community) => {
    const before = best(community, baseline),
      after = best(community, s);
    return {
      community,
      before,
      after,
      covered: after !== null && after <= s.threshold,
      affected: before !== after,
    };
  });
  const count = rows.length;
  const covered = rows.filter((r) => r.covered).length;
  return {
    baseline: count
      ? (rows.filter((r) => r.before !== null && r.before <= s.threshold)
          .length /
          count) *
        100
      : 0,
    current: count ? (covered / count) * 100 : 0,
    count,
    covered,
    rows,
  };
}
export function decodePolyline(encoded: string): LatLng[] {
  let index = 0,
    lat = 0,
    lng = 0;
  const points: LatLng[] = [];
  const read = () => {
    let shift = 0,
      result = 0,
      b;
    do {
      if (index >= encoded.length || shift > 30)
        throw new Error("Invalid polyline");
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 31) << shift;
      shift += 5;
    } while (b >= 32);
    return result & 1 ? ~(result >> 1) : result >> 1;
  };
  while (index < encoded.length) {
    lat += read();
    lng += read();
    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return points;
}
export function delaySeconds(duration: number, staticDuration: number | null) {
  return staticDuration === null
    ? null
    : Math.max(0, duration - staticDuration);
}
