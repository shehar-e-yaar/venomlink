import { describe, expect, it } from "vitest";
import { fastestRoute, miles } from "../src/services/hospitalSelection";
import type { MatrixItem } from "../src/types";
const item = (
  facilityId: string,
  durationSec: number | null,
  distanceMeters: number | null,
): MatrixItem => ({ facilityId, durationSec, distanceMeters, staticSec: null });
describe("traffic-aware hospital selection", () => {
  it("prioritizes driving time over proximity", () => {
    expect(
      fastestRoute([item("near", 1200, 1000), item("quick", 600, 7000)])
        ?.facilityId,
    ).toBe("quick");
  });
  it("uses road distance only to break equal-time ties", () => {
    expect(
      fastestRoute([item("long", 600, 7000), item("short", 600, 3000)])
        ?.facilityId,
    ).toBe("short");
  });
  it("ignores missing, negative and non-finite provider values", () => {
    expect(
      fastestRoute([
        item("missing", null, 10),
        item("bad", NaN, 10),
        item("negative", -1, 10),
        item("distance", 30, Infinity),
      ]),
    ).toBeNull();
    expect(
      fastestRoute([item("missing", null, null), item("valid", 600, 5000)])
        ?.facilityId,
    ).toBe("valid");
  });
  it("shows miles without treating missing routes as zero", () => {
    expect(miles(1609.344)).toBe("1.0");
    expect(fastestRoute([])).toBeNull();
  });
});
