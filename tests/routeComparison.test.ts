import { describe, it, expect } from "vitest";
import { compareWithRoutes } from "../backend/routeComparison";
import { handler } from "../backend/handler";
const facilities = [
  { id: "a", kind: "human-hospital" },
  { id: "b", kind: "human-hospital" },
];
describe("No-billing demo route comparison", () => {
  it("keeps per-facility failures unavailable and does not reorder successful estimates", async () => {
    const results = await compareWithRoutes(facilities, async (f) => {
      if (f.id === "a") throw new Error("Routing quota reached");
      return {
        routes: [
          { duration: "600s", staticDuration: "550s", distanceMeters: 2500 },
        ],
      };
    });
    expect(results[0]).toMatchObject({
      facilityId: "a",
      durationSec: null,
      error: "Routing quota reached",
    });
    expect(results[1]).toMatchObject({
      facilityId: "b",
      durationSec: 600,
      staticSec: 550,
      distanceMeters: 2500,
    });
  });
  it("does not turn missing or malformed routes into driving estimates", async () => {
    for (const response of [
      { routes: [] },
      { routes: [{ duration: "bad", distanceMeters: 500 }] },
      { routes: [{ duration: "20s", distanceMeters: -1 }] },
    ]) {
      const [item] = await compareWithRoutes(
        [facilities[0]],
        async () => response,
      );
      expect(item.durationSec).toBeNull();
      expect(item.distanceMeters).toBeNull();
    }
  });
  it("refuses excess requests, duplicate destinations and reference institutions before calling the provider", async () => {
    let calls = 0;
    const calculate = async () => {
      calls++;
      return { routes: [] };
    };
    await expect(
      compareWithRoutes(
        Array.from({ length: 6 }, (_, i) => ({
          id: String(i),
          kind: "human-hospital",
        })),
        calculate,
      ),
    ).rejects.toThrow();
    await expect(
      compareWithRoutes([facilities[0], facilities[0]], calculate),
    ).rejects.toThrow();
    await expect(
      compareWithRoutes([{ id: "uvas", kind: "reference" }], calculate),
    ).rejects.toThrow();
    expect(calls).toBe(0);
  });
  it("allows only explicit development origins and returns their CORS origin", async () => {
    const response = await handler({
      rawPath: "/api/health",
      headers: { origin: "http://127.0.0.1:5190" },
    });
    expect(response.statusCode).toBe(200);
    expect(response.headers["access-control-allow-origin"]).toBe(
      "http://127.0.0.1:5190",
    );
    expect(
      (
        await handler({
          rawPath: "/api/health",
          headers: { origin: "http://127.0.0.1.attacker.example" },
        })
      ).statusCode,
    ).toBe(403);
  });
});
