export type LatLng = { lat: number; lng: number };
export type Origin = LatLng & {
  id: string;
  name: string;
  side: "north" | "south";
  sourceUrl?: string;
};
export type Facility = LatLng & {
  id: string;
  name: string;
  neighborhood: string;
  kind: "human-hospital" | "reference";
  coordinateSource: string;
  coordinateQuality: string;
  sourceUrl: string;
  sourceOrganization: string;
  sourceDate: string | null;
  locationStatus: "source-linked" | "approximate";
  reviewedAt: string;
  clinicalStatus: "unknown" | "confirmed" | "not-human-care";
  capabilityVerifiedAt: string | null;
  antivenomStatus: string;
  planningEligible: boolean;
  side: "north" | "south";
};
export type Dataset = {
  version: string;
  ingestedAt: string;
  license: string;
  source: string;
  facilities: Facility[];
};
export type Scenario = {
  delay: boolean;
  closure: boolean;
  upgrade: boolean;
  threshold: number;
};
export type PlanningJourney = {
  facilityId: string;
  minutes: number;
  distanceKm: number;
  crosses: boolean;
  path: LatLng[];
  available: boolean;
};
export type CommunityAccess = {
  community: Origin;
  before: number | null;
  after: number | null;
  covered: boolean;
  affected: boolean;
};
export type Coverage = {
  baseline: number;
  current: number;
  count: number;
  covered: number;
  rows: CommunityAccess[];
};
export type MatrixItem = {
  facilityId: string;
  durationSec: number | null;
  staticSec: number | null;
  distanceMeters: number | null;
  error?: string;
};
export type TrafficInterval = {
  startPolylinePointIndex?: number;
  endPolylinePointIndex: number;
  speed: "NORMAL" | "SLOW" | "TRAFFIC_JAM";
};
export type LiveRoute = {
  durationSec: number;
  staticSec: number | null;
  distanceMeters: number;
  encodedPolyline: string;
  intervals: TrafficInterval[];
  calculatedAt: string;
};
export type DiscoveredPlace = {
  id: string;
  title: string;
  position: [number, number];
  categories: string[];
  attribution: string;
  matchedFacilityId?: string;
};
