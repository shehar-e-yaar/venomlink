import { describe, it, expect } from "vitest";
import {
  coverage,
  planJourney,
  eligible,
  decodePolyline,
  delaySeconds,
  haversine,
} from "../src/services/accessibilityService";
import data from "../public/data/facilities.json";
import communities from "../public/data/communities.json";
import type { Facility, Origin, Scenario } from "../src/types";
const fs = data.facilities as Facility[],
  os = communities as Origin[];
const base: Scenario = {
  delay: false,
  closure: false,
  upgrade: false,
  threshold: 20,
};
describe("Geographic planning with explicit assumptions", () => {
  it("adds delay only to crossing-dependent journeys", () => {
    for (const o of os)
      for (const f of fs) {
        const a = planJourney(o, f, base),
          b = planJourney(o, f, { ...base, delay: true });
        expect(b.minutes - a.minutes).toBeCloseTo(o.side !== f.side ? 20 : 0);
      }
  });
  it("closure removes a crossing connection without inventing a detour", () => {
    const f = fs.find((f) => f.id === "mayo")!;
    expect(planJourney(os[0], f, { ...base, closure: true }).available).toBe(
      false,
    );
    expect(
      planJourney(
        os.find((o) => o.side === "south")!,
        f,
        { ...base, closure: true },
      ).available,
    ).toBe(true);
  });
  it("upgrade changes THQ eligibility only and never makes reference institutions eligible", () => {
    const up = { ...base, upgrade: true };
    expect(
      fs.filter((f) => eligible(f, up) && !eligible(f, base)).map((f) => f.id),
    ).toEqual(["shahdara-thq"]);
    expect(
      fs.filter((f) => f.kind === "reference").every((f) => !eligible(f, up)),
    ).toBe(true);
  });
  it("delay cannot improve coverage; upgrades cannot reduce it", () => {
    const a = coverage(os, fs, base);
    expect(
      coverage(os, fs, { ...base, delay: true }).current,
    ).toBeLessThanOrEqual(a.current);
    expect(
      coverage(os, fs, { ...base, upgrade: true }).current,
    ).toBeGreaterThanOrEqual(a.current);
    expect(a.count).toBe(os.length);
    expect((a.covered / a.count) * 100).toBe(a.current);
  });
  it("handles empty filters and unavailable paths without NaN or fake ETAs", () => {
    expect(coverage([], fs, base).current).toBe(0);
    const a = coverage(os, [], base);
    expect(a.current).toBe(0);
    expect(a.rows.every((r) => r.after === null)).toBe(true);
    const b = coverage(
      os.filter((o) => o.side === "north"),
      fs,
      { ...base, closure: true },
    );
    expect(b.rows.every((r) => r.after === null)).toBe(true);
  });
  it("uses stable geodesic distance and decodes real provider geometry", () => {
    expect(haversine(os[0], os[0])).toBe(0);
    expect(decodePolyline("_p~iF~ps|U_ulLnnqC_mqNvxq`@")).toEqual([
      { lat: 38.5, lng: -120.2 },
      { lat: 40.7, lng: -120.95 },
      { lat: 43.252, lng: -126.453 },
    ]);
    expect(() => decodePolyline("_")).toThrow();
    expect(delaySeconds(50, 60)).toBe(0);
    expect(delaySeconds(50, null)).toBeNull();
  });
});
