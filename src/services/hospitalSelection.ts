import type { MatrixItem } from "../types";
// User-listed leads, not independently verified stock records.
export const ANTIVENOM_LEADS = new Set([
  "mayo",
  "jinnah",
  "services",
  "ganga-ram",
  "general",
  "shaikh-zayed",
  "yakki-gate",
]);
export function fastestRoute(items: MatrixItem[]) {
  return (
    [...items]
      .filter(
        (i) =>
          i.durationSec !== null &&
          Number.isFinite(i.durationSec) &&
          i.durationSec >= 0 &&
          i.distanceMeters !== null &&
          Number.isFinite(i.distanceMeters) &&
          i.distanceMeters >= 0,
      )
      .sort(
        (a, b) =>
          a.durationSec! - b.durationSec! ||
          a.distanceMeters! - b.distanceMeters!,
      )[0] ?? null
  );
}
export const miles = (meters: number) => (meters / 1609.344).toFixed(1);
