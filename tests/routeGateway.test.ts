import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Facility, Origin } from "../src/types";
const mocks = vi.hoisted(() => ({ selected: vi.fn(), matrix: vi.fn() }));
vi.mock("../src/services/apiClient", () => ({
  MAPS_DEMO: true,
  MAPS_KEY: "test-demo-key",
  selectedRoute: mocks.selected,
  routeMatrix: mocks.matrix,
}));
const origin = { lat: 31.6, lng: 74.3 } as Origin,
  facility = { id: "mayo", lat: 31.57, lng: 74.31 } as Facility;
const route = {
  durationSec: 600,
  staticSec: 500,
  distanceMeters: 4000,
  encodedPolyline: "abc",
  intervals: [],
  calculatedAt: "now",
};
const google = () =>
  new Response(
    JSON.stringify({
      routes: [
        {
          duration: "600s",
          staticDuration: "500s",
          distanceMeters: 4000,
          polyline: { encodedPolyline: "abc" },
        },
      ],
    }),
    { status: 200 },
  );
beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});
describe("demo route fallback", () => {
  it("retains the existing backend when it succeeds", async () => {
    mocks.selected.mockResolvedValue(route);
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const { getSelectedRoute } = await import("../src/services/routeGateway");
    expect(
      await getSelectedRoute(origin, facility, new AbortController().signal),
    ).toEqual(route);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("uses the configured browser key after quota errors and reuses recent routes", async () => {
    mocks.selected.mockRejectedValue(new Error("Routing quota reached"));
    const fetch = vi.fn().mockResolvedValue(google());
    vi.stubGlobal("fetch", fetch);
    const { getSelectedRoute } = await import("../src/services/routeGateway");
    const signal = new AbortController().signal;
    expect((await getSelectedRoute(origin, facility, signal)).durationSec).toBe(
      600,
    );
    expect(
      (await getSelectedRoute(origin, facility, signal)).distanceMeters,
    ).toBe(4000);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0][1].headers["X-Goog-Api-Key"]).toBe(
      "test-demo-key",
    );
  });
  it("keeps a real error when Google also refuses the fallback", async () => {
    mocks.selected.mockRejectedValue(new Error("Routing quota reached"));
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("{}", { status: 429 })),
    );
    const { getSelectedRoute } = await import("../src/services/routeGateway");
    await expect(
      getSelectedRoute(origin, facility, new AbortController().signal),
    ).rejects.toThrow("Google demo route limit reached");
  });
  it("does not mask non-quota backend failures", async () => {
    mocks.selected.mockRejectedValue(new Error("Invalid origin"));
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const { getSelectedRoute } = await import("../src/services/routeGateway");
    await expect(
      getSelectedRoute(origin, facility, new AbortController().signal),
    ).rejects.toThrow("Invalid origin");
    expect(fetch).not.toHaveBeenCalled();
  });
});
