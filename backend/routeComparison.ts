import { seconds } from "./shared";
import type { MatrixItem } from "../src/types";
type Candidate = { id: string; kind: string };
type RouteResponse = {
  routes?: {
    duration?: unknown;
    staticDuration?: unknown;
    distanceMeters?: unknown;
  }[];
};
// Demo keys support computeRoutes, not computeRouteMatrix. Keep this explicit
// and capped so a comparison cannot silently exhaust many route requests.
export async function compareWithRoutes<T extends Candidate>(
  facilities: T[],
  calculate: (facility: T) => Promise<RouteResponse>,
): Promise<MatrixItem[]> {
  if (
    !facilities.length ||
    facilities.length > 5 ||
    new Set(facilities.map((f) => f.id)).size !== facilities.length
  )
    throw new Error("Select 1–5 unique facilities for a demo comparison");
  if (facilities.some((f) => f.kind !== "human-hospital"))
    throw new Error("Unknown facility");
  return Promise.all(
    facilities.map(async (f) => {
      try {
        const response = await calculate(f),
          r = response.routes?.[0],
          durationSec = seconds(r?.duration),
          staticSec = seconds(r?.staticDuration);
        if (
          durationSec === null ||
          !Number.isFinite(durationSec) ||
          typeof r?.distanceMeters !== "number" ||
          !Number.isFinite(r.distanceMeters) ||
          r.distanceMeters < 0
        )
          throw new Error("No usable driving estimate returned");
        return {
          facilityId: f.id,
          durationSec,
          staticSec,
          distanceMeters: r.distanceMeters,
        };
      } catch (error) {
        return {
          facilityId: f.id,
          durationSec: null,
          staticSec: null,
          distanceMeters: null,
          error: (error as Error).message,
        };
      }
    }),
  );
}
