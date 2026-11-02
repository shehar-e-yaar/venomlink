import { describe, it, expect } from "vitest";
import { coordinates, radius, seconds, parseMatrix } from "../backend/shared";
import { handler } from "../backend/handler";
import { validDataset } from "../src/services/apiClient";
import data from "../public/data/facilities.json";
import type { Dataset } from "../src/types";
describe("Provider boundaries and independent data", () => {
  it("rejects reversed, missing and out-of-area coordinates", () => {
    expect(coordinates("31.61", "74.29")).toEqual({ lat: 31.61, lng: 74.29 });
    for (const p of [
      [74.29, 31.61],
      [undefined, undefined],
      [NaN, 74.29],
      [32, 74.2],
    ])
      expect(() => coordinates(...(p as [unknown, unknown]))).toThrow();
    expect(radius(undefined)).toBe(10000);
    expect(() => radius(999)).toThrow();
    expect(() => radius(25001)).toThrow();
  });
  it("keeps matrix errors attached to the correct destination regardless of response order", () => {
    const r = parseMatrix(
      [
        {
          originIndex: 0,
          destinationIndex: 2,
          condition: "ROUTE_EXISTS",
          duration: "900s",
          staticDuration: "600s",
          distanceMeters: 1234,
        },
        {
          originIndex: 0,
          destinationIndex: 0,
          status: { code: 5, message: "Unavailable" },
        },
      ],
      ["a", "b", "c"],
    );
    expect(r[0].durationSec).toBeNull();
    expect(r[1].durationSec).toBeNull();
    expect(r[2]).toMatchObject({
      facilityId: "c",
      durationSec: 900,
      staticSec: 600,
      distanceMeters: 1234,
    });
    expect(seconds("bad")).toBeNull();
    expect(seconds("1.5s")).toBe(1.5);
  });
  it("validates source-linked records and rejects duplicate IDs or invalid coordinates", () => {
    expect(validDataset(data as Dataset).facilities).toHaveLength(11);
    const d = structuredClone(data) as Dataset;
    d.facilities[1].id = d.facilities[0].id;
    expect(() => validDataset(d)).toThrow();
    d.facilities[1].id = "unique";
    d.facilities[1].lat = 74;
    expect(() => validDataset(d)).toThrow();
  });
  it("rejects disallowed origins and malformed searches before calling providers", async () => {
    expect(
      (
        await handler({
          rawPath: "/api/aws/nearby",
          headers: { origin: "https://untrusted.example" },
        })
      ).statusCode,
    ).toBe(403);
    expect(
      (
        await handler({
          rawPath: "/api/aws/nearby",
          queryStringParameters: { lat: "bad", lng: "74.3" },
        })
      ).statusCode,
    ).toBe(400);
    expect(
      (await handler({ rawPath: "/api/routes/selected", body: "{bad" }))
        .statusCode,
    ).toBe(400);
    expect(
      (
        await handler({
          rawPath: "/api/routes/selected",
          body: "x".repeat(12001),
        })
      ).statusCode,
    ).toBe(413);
  });
});
