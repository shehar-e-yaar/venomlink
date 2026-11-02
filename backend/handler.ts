import {
  GeoPlacesClient,
  SearchNearbyCommand,
  SearchTextCommand,
} from "@aws-sdk/client-geo-places";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";
import { coordinates, radius, parseMatrix, seconds } from "./shared";
import { compareWithRoutes } from "./routeComparison";
import type { Facility, LatLng } from "../src/types";
const region = process.env.AWS_REGION || "ap-south-1";
const places = new GeoPlacesClient({ region }),
  s3 = new S3Client({ region }),
  secrets = new SecretsManagerClient({ region });
type Event = {
  rawPath?: string;
  requestContext?: { http?: { method?: string } };
  headers?: Record<string, string>;
  queryStringParameters?: Record<string, string>;
  body?: string;
};
let googleKey: string | undefined;
async function dataset(key: string) {
  if (!process.env.DATA_BUCKET)
    throw new Error("Independent S3 dataset is not configured");
  const d = await s3.send(
    new GetObjectCommand({ Bucket: process.env.DATA_BUCKET, Key: key }),
  );
  return JSON.parse(await d.Body!.transformToString());
}
async function key() {
  if (!googleKey) {
    if (!process.env.GOOGLE_ROUTES_SECRET_ARN)
      throw new Error("Google Routes is not configured");
    const s = await secrets.send(
      new GetSecretValueCommand({
        SecretId: process.env.GOOGLE_ROUTES_SECRET_ARN,
      }),
    );
    const v = s.SecretString || "";
    try {
      googleKey = JSON.parse(v).apiKey;
    } catch {
      googleKey = v;
    }
    if (!googleKey) throw new Error("Routes secret is empty");
  }
  return googleKey;
}
async function google(
  method: "computeRoutes" | "computeRouteMatrix",
  body: unknown,
  mask: string,
) {
  const r = await fetch(
    `https://routes.googleapis.com/${method === "computeRouteMatrix" ? "distanceMatrix" : "directions"}/v2:${method}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": await key(),
        "X-Goog-FieldMask": mask,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(12000),
    },
  );
  if (!r.ok) {
    const reason =
      r.status === 429
        ? "Routing quota reached"
        : r.status === 403
          ? "Routing authorization or billing unavailable"
          : "Routing provider unavailable";
    throw new Error(reason);
  }
  return r.json();
}
const waypoint = (p: LatLng) => ({
  location: { latLng: { latitude: p.lat, longitude: p.lng } },
});
export async function handler(event: Event) {
  const origin = event.headers?.origin || event.headers?.Origin;
  const allowed = process.env.ALLOWED_ORIGIN || "http://localhost:5190";
  const allowedOrigins = [
    allowed,
    "http://localhost:5190",
    "http://127.0.0.1:5190",
  ];
  const headers = {
    "content-type": "application/json",
    "cache-control": "no-store",
    "access-control-allow-origin":
      origin && allowedOrigins.includes(origin) ? origin : allowed,
    "access-control-allow-headers": "Content-Type",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    vary: "Origin",
  };
  const respond = (statusCode: number, body: unknown) => ({
    statusCode,
    headers,
    body: JSON.stringify(body),
  });
  if (origin && !allowedOrigins.includes(origin))
    return respond(403, { error: "Origin is not allowed" });
  if (event.requestContext?.http?.method === "OPTIONS") return respond(204, {});
  try {
    const path = (event.rawPath || "").replace(/^\/api/, "");
    const q = event.queryStringParameters || {};
    if (path === "/health")
      return respond(200, {
        aws: "configured",
        s3: !!process.env.DATA_BUCKET,
        googleRoutes: !!process.env.GOOGLE_ROUTES_SECRET_ARN,
        googleDemoMode: process.env.GOOGLE_MAPS_DEMO_MODE === "true",
      });
    if (path === "/facilities")
      return respond(200, {
        ...(await dataset("validated/facilities.json")),
        delivery: {
          service: "Amazon S3",
          bucket: process.env.DATA_BUCKET,
          key: "validated/facilities.json",
        },
      });
    if (path === "/communities")
      return respond(200, await dataset("planning/communities.json"));
    if (path === "/aws/nearby" || path === "/aws/search") {
      const p = coordinates(q.lat, q.lng);
      const r = radius(q.radius);
      const result =
        path === "/aws/nearby"
          ? await places.send(
              new SearchNearbyCommand({
                QueryPosition: [p.lng, p.lat],
                QueryRadius: r,
                MaxResults: 20,
                Filter: {
                  IncludeCategories: [
                    "hospital",
                    "hospital_emergency_room",
                    "hospital_or_health_care_facility",
                  ],
                  IncludeCountries: ["PAK"],
                },
                IntendedUse: "SingleUse",
                Language: "en",
              }),
            )
          : await places.send(
              new SearchTextCommand({
                QueryText: (q.text || "hospital").slice(0, 160),
                BiasPosition: [p.lng, p.lat],
                Filter: { IncludeCountries: ["PAK"] },
                MaxResults: 10,
                IntendedUse: "SingleUse",
                Language: "en",
              }),
            );
      const items = (result.ResultItems || [])
        .filter((v) => v.Position?.length === 2)
        .map((v) => ({
          id: v.PlaceId,
          title: v.Title,
          position: v.Position,
          placeType: v.PlaceType,
          categories: (v.Categories || []).map((c) => c.Name || c.Id),
          attribution:
            process.env.AWS_PLACES_ATTRIBUTION ||
            "Amazon Location Service · © HERE",
        }));
      return respond(200, {
        places: items,
        origin: p,
        radius: r,
        attribution:
          process.env.AWS_PLACES_ATTRIBUTION ||
          "Amazon Location Service · © HERE",
        intendedUse: "SingleUse",
        searchedAt: new Date().toISOString(),
        display:
          "Separate discovery list; not persisted or plotted on third-party maps",
      });
    }
    if (path === "/routes/matrix" || path === "/routes/selected") {
      if ((event.body?.length || 0) > 12000)
        return respond(413, { error: "Request is too large" });
      const body = JSON.parse(event.body || "{}");
      const o = coordinates(body.origin?.lat, body.origin?.lng);
      const source = await dataset("validated/facilities.json");
      const facilities: Facility[] = source.facilities.filter(
        (f: Facility) => f.kind === "human-hospital",
      );
      if (path === "/routes/matrix") {
        if (
          !Array.isArray(body.facilityIds) ||
          body.facilityIds.length < 1 ||
          body.facilityIds.length > 12
        )
          throw new Error("Select 1–12 facilities");
        const selected = body.facilityIds.map((id: string) =>
          facilities.find((f) => f.id === id),
        );
        if (selected.some((f: Facility | undefined) => !f))
          throw new Error("Unknown facility");
        if (process.env.GOOGLE_MAPS_DEMO_MODE === "true") {
          const items = await compareWithRoutes(selected as Facility[], (f) =>
            google(
              "computeRoutes",
              {
                origin: waypoint(o),
                destination: waypoint(f),
                travelMode: "DRIVE",
                routingPreference: "TRAFFIC_AWARE",
              },
              "routes.duration,routes.staticDuration,routes.distanceMeters",
            ),
          );
          return respond(200, {
            items,
            calculatedAt: new Date().toISOString(),
            provider: "Google Maps",
            method: "computeRoutes · on-demand comparison · Maps Demo Key",
          });
        }
        const d = await google(
          "computeRouteMatrix",
          {
            origins: [{ waypoint: waypoint(o) }],
            destinations: selected.map((f: Facility) => ({
              waypoint: waypoint(f),
            })),
            travelMode: "DRIVE",
            routingPreference: "TRAFFIC_AWARE",
          },
          "originIndex,destinationIndex,status,condition,distanceMeters,duration,staticDuration",
        );
        return respond(200, {
          items: parseMatrix(d, body.facilityIds),
          calculatedAt: new Date().toISOString(),
          provider: "Google Maps",
        });
      }
      const f = facilities.find((f) => f.id === body.facilityId);
      if (!f) throw new Error("Unknown facility");
      const d = await google(
        "computeRoutes",
        {
          origin: waypoint(o),
          destination: waypoint(f),
          travelMode: "DRIVE",
          routingPreference: "TRAFFIC_AWARE",
          extraComputations: ["TRAFFIC_ON_POLYLINE"],
          polylineQuality: "HIGH_QUALITY",
        },
        "routes.duration,routes.staticDuration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.travelAdvisory.speedReadingIntervals",
      );
      const route = d.routes?.[0];
      if (
        !route ||
        seconds(route.duration) === null ||
        !Number.isFinite(seconds(route.duration)) ||
        !Number.isFinite(route.distanceMeters) ||
        route.distanceMeters < 0 ||
        !route.polyline?.encodedPolyline
      )
        throw new Error("No usable route returned");
      return respond(200, {
        durationSec: seconds(route.duration),
        staticSec: seconds(route.staticDuration),
        distanceMeters: route.distanceMeters,
        encodedPolyline: route.polyline.encodedPolyline,
        intervals: route.travelAdvisory?.speedReadingIntervals || [],
        calculatedAt: new Date().toISOString(),
        provider: "Google Maps",
      });
    }
    return respond(404, { error: "Endpoint not found" });
  } catch (error) {
    const message = (error as Error).message;
    if (message === "Routing quota reached")
      return respond(429, {
        error:
          "Maps request quota reached. Try later; demo limits reset automatically.",
      });
    const invalid = /coordinates|Radius|Select |Unknown facility|JSON/.test(
      message,
    );
    return respond(invalid ? 400 : 503, {
      error: invalid
        ? message
        : "Service unavailable. Check provider setup, permissions or quota.",
      configured: false,
    });
  }
}
