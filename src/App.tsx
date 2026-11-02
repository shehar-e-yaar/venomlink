import {
  ANTIVENOM_LEADS,
  fastestRoute,
  miles,
} from "./services/hospitalSelection";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  ArrowDown,
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  Cloud,
  Code2,
  Database,
  Diamond,
  GitBranch,
  Globe2,
  Hospital,
  ImagePlus,
  Info,
  Layers,
  LocateFixed,
  MapPin,
  Navigation,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  ShieldQuestion,
  SlidersHorizontal,
  TrafficCone,
  Workflow,
  X,
} from "lucide-react";
import communityData from "../public/data/communities.json";
import { LiveTrafficMap, type MapMode } from "./components/LiveTrafficMap";
import { DataLineageFlip } from "./components/DataLineageFlip";
import { ProductExperience } from "./components/ProductExperience";
import { RouteComparison } from "./components/RouteComparison";
import { Dialog } from "./components/Dialog";
import { SnakePhotoAssistant } from "./components/SnakePhotoAssistant";
import { AWSLocationDiscovery } from "./components/AWSLocationDiscovery";
import {
  coverage as calculateCoverage,
  planJourney,
  ASSUMPTIONS,
  delaySeconds,
  haversine,
} from "./services/accessibilityService";
import {
  API,
  MAPS_KEY,
  MAPS_DEMO,
  REFRESH_MS,
  discover,
  getFacilities,
  routeMatrix,
  selectedRoute,
  validDataset,
} from "./services/apiClient";
import type {
  Dataset,
  DiscoveredPlace,
  Facility,
  LiveRoute,
  MatrixItem,
  Origin,
  Scenario,
} from "./types";
const communities = communityData as Origin[];
type Modal =
  | "routes"
  | "origin"
  | "traffic"
  | "planner"
  | "photo"
  | "data"
  | "architecture"
  | "aws"
  | "privacy"
  | "terms"
  | null;
export default function App() {
  const [dataset, setDataset] = useState<Dataset | null>(null),
    [dataSource, setDataSource] = useState("Loading independent records"),
    [dataError, setDataError] = useState(""),
    [origin, setOrigin] = useState<Origin>(communities[0]),
    [selectedId, setSelectedId] = useState<string | null>("mayo"),
    [scenario, setScenario] = useState<Scenario>({
      delay: false,
      closure: false,
      upgrade: false,
      threshold: 20,
    }),
    [northOnly, setNorthOnly] = useState(false),
    [verifiedOnly, setVerifiedOnly] = useState(false),
    [traffic, setTraffic] = useState(true),
    [showZones, setShowZones] = useState(false),
    [mapMode, setMapMode] = useState<MapMode>("loading"),
    [focusToken, setFocusToken] = useState(0),
    [modal, setModal] = useState<Modal>(null),
    [directoryQuery, setDirectoryQuery] = useState(""),
    [originQuery, setOriginQuery] = useState(""),
    [originError, setOriginError] = useState(""),
    [notice, setNotice] = useState(""),
    [atlasActive, setAtlasActive] = useState(false),
    [matrix, setMatrix] = useState<MatrixItem[]>([]),
    [matrixStatus, setMatrixStatus] = useState("unavailable"),
    [matrixError, setMatrixError] = useState(""),
    [route, setRoute] = useState<LiveRoute | null>(null),
    [routeStatus, setRouteStatus] = useState("unavailable"),
    [routeError, setRouteError] = useState(""),
    [refreshedAt, setRefreshedAt] = useState<string | null>(null),
    [refreshNonce, setRefreshNonce] = useState(0),
    [matrixNonce, setMatrixNonce] = useState(0),
    [awsStatus, setAwsStatus] = useState("unavailable"),
    [awsPlaces, setAwsPlaces] = useState<DiscoveredPlace[]>([]),
    [awsError, setAwsError] = useState(""),
    [awsTime, setAwsTime] = useState<string | null>(null),
    [radius, setRadius] = useState(10000);
  const mapSection = useRef<HTMLElement>(null),
    awsAbort = useRef<AbortController | null>(null);
  useEffect(() => {
    const node = mapSection.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setAtlasActive(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const close = useCallback(() => setModal(null), []);
  useEffect(() => {
    const c = new AbortController();
    async function load() {
      try {
        const r = await fetch(
          `${import.meta.env.BASE_URL}data/facilities.json`,
          { signal: c.signal },
        );
        if (!r.ok) throw new Error("Independent dataset unavailable");
        const local = validDataset(await r.json());
        if (c.signal.aborted) return;
        setDataset(local);
        setDataSource("Bundled independent snapshot");
        if (API) {
          try {
            const remote = await getFacilities(c.signal);
            validDataset(remote);
            if (!c.signal.aborted) {
              setDataset(remote);
              setDataSource(
                `Amazon S3 · ${remote.delivery.bucket}/${remote.delivery.key}`,
              );
            }
          } catch (e) {
            if (!c.signal.aborted)
              setDataError(
                "S3 endpoint unavailable; using the bundled independent snapshot.",
              );
          }
        }
      } catch (e) {
        if (!c.signal.aborted) setDataError((e as Error).message);
      }
    }
    void load();
    return () => c.abort();
  }, []);
  const facilities = dataset?.facilities || [];
  const selected = facilities.find((f) => f.id === selectedId) || null;
  const select = useCallback((f: Facility) => {
    setSelectedId(f.id);
    setFocusToken((t) => t + 1);
  }, []);
  const chooseOrigin = (o: Origin) => {
    setOrigin(o);
    setMatrixNonce(0);
    setFocusToken((t) => t + 1);
    setModal(null);
    setRoute(null);
    setOriginError("");
  };
  const choosePoint = (p: { lat: number; lng: number }) => {
    if (p.lat < 31.2 || p.lat > 31.8 || p.lng < 74 || p.lng > 74.7) {
      setNotice("Choose a location within the Lahore study area.");
      return;
    }
    chooseOrigin({
      ...p,
      id: "custom-origin",
      name: "Selected map point",
      side: p.lat > 31.609 ? "north" : "south",
    });
    setNotice(
      "Map origin selected. River-side classification is approximate in the illustrative model.",
    );
  };
  const analyzed = useMemo(() => {
    const sample = northOnly
      ? communities.filter((c) => c.side === "north")
      : communities;
    return sample.some((c) => c.id === origin.id) ||
      (northOnly && origin.side !== "north")
      ? sample
      : [...sample, origin];
  }, [origin, northOnly]);
  const planningFacilities = verifiedOnly
    ? facilities.filter((f) => f.clinicalStatus === "confirmed")
    : facilities;
  const coverage = calculateCoverage(analyzed, planningFacilities, scenario);
  const journey =
    selected && selected.kind === "human-hospital"
      ? planJourney(origin, selected, scenario)
      : null;
  const candidates = useMemo(() => {
    const hospitals = facilities.filter(
      (f) => f.kind === "human-hospital" && ANTIVENOM_LEADS.has(f.id),
    );
    return [...hospitals]
      .sort((a, b) => haversine(origin, a) - haversine(origin, b))
      .map((f) => f.id);
  }, [dataset, origin]);
  useEffect(() => {
    const c = new AbortController();
    setMatrix([]);
    setMatrixError("");
    if (!atlasActive) {
      setMatrixStatus("waiting");
      return;
    }
    if (API && dataSource === "Bundled independent snapshot" && !dataError) {
      setMatrixStatus("loading");
      return;
    }
    if (!API || mapMode !== "google" || !candidates.length) {
      setMatrixStatus("unavailable");
      return;
    }
    setMatrixStatus("loading");
    const timer = setTimeout(async () => {
      setMatrixStatus("loading");
      try {
        // Each existing demo comparison supports at most five destinations.
        const batches = [];
        for (let i = 0; i < candidates.length; i += 5)
          batches.push(candidates.slice(i, i + 5));
        const responses = await Promise.all(
          batches.map((ids) =>
            routeMatrix(origin, ids, c.signal).catch((error) => {
              if (c.signal.aborted) throw error;
              return {
                items: ids.map((facilityId) => ({
                  facilityId,
                  durationSec: null,
                  staticSec: null,
                  distanceMeters: null,
                  error: (error as Error).message,
                })),
                calculatedAt: new Date().toISOString(),
              };
            }),
          ),
        );
        const d = {
          items: responses.flatMap((r) => r.items),
          calculatedAt: responses.at(-1)!.calculatedAt,
        };
        if (!c.signal.aborted) {
          setMatrix(d.items);
          setRefreshedAt(d.calculatedAt);
          const best = fastestRoute(d.items);
          const usable = !!best;
          if (best) setSelectedId(best.facilityId);
          setMatrixStatus(usable ? "connected" : "error");
          if (!usable)
            setMatrixError(
              d.items.find((i) => i.error)?.error ||
                "No driving estimates returned. Try later.",
            );
        }
      } catch (e) {
        if (!c.signal.aborted) {
          setMatrixStatus("error");
          setMatrixError((e as Error).message);
        }
      }
    }, 600);
    return () => {
      clearTimeout(timer);
      c.abort();
    };
  }, [
    origin,
    candidates,
    mapMode,
    atlasActive,
    dataSource,
    dataError,
    MAPS_DEMO ? matrixNonce : refreshNonce,
  ]);
  useEffect(() => {
    const c = new AbortController();
    setRoute(null);
    setRouteError("");
    if (
      !API ||
      mapMode !== "google" ||
      !selected ||
      selected.kind === "reference"
    ) {
      setRouteStatus("unavailable");
      return;
    }
    const timer = setTimeout(async () => {
      setRouteStatus("loading");
      try {
        const d = await selectedRoute(origin, selected.id, c.signal);
        if (!c.signal.aborted) {
          setRoute(d);
          setRouteStatus("connected");
        }
      } catch (e) {
        if (!c.signal.aborted) {
          setRouteStatus("error");
          setRouteError((e as Error).message);
        }
      }
    }, 450);
    return () => {
      clearTimeout(timer);
      c.abort();
    };
  }, [origin, selectedId, mapMode, refreshNonce, dataset]);
  useEffect(() => {
    if (!API || mapMode !== "google") return;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") setRefreshNonce((n) => n + 1);
    }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [mapMode]);
  const searchAws = useCallback(
    async (text?: string) => {
      awsAbort.current?.abort();
      const c = new AbortController();
      awsAbort.current = c;
      setAwsPlaces([]);
      setAwsError("");
      if (!API) {
        setAwsStatus("unavailable");
        setAwsError(
          "AWS Lambda endpoint is not configured. No AWS search was performed.",
        );
        return;
      }
      setAwsStatus("searching");
      try {
        const d = await discover(origin, radius, text, c.signal);
        if (!c.signal.aborted) {
          setAwsPlaces(d.places);
          setAwsTime(d.searchedAt);
          setAwsStatus("connected");
        }
      } catch (e) {
        if (!c.signal.aborted) {
          setAwsStatus("error");
          setAwsError((e as Error).message);
        }
      }
    },
    [origin, radius],
  );
  useEffect(() => {
    setAwsPlaces([]);
    setAwsTime(null);
    setAwsStatus("unavailable");
    if (!API) return;
    const timer = setTimeout(() => void searchAws(), 650);
    return () => {
      clearTimeout(timer);
      awsAbort.current?.abort();
    };
  }, [origin]);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 6000);
    return () => clearTimeout(t);
  }, [notice]);
  const toggleTraffic = () => {
    if (mapMode !== "google") {
      setNotice(
        "Traffic is unavailable on the demo map. Configure Google Maps to enable the official TrafficLayer.",
      );
      setModal("traffic");
      return;
    }
    setTraffic((t) => !t);
  };
  const reset = () => {
    setScenario({
      delay: false,
      closure: false,
      upgrade: false,
      threshold: 20,
    });
    setNorthOnly(false);
    setVerifiedOnly(false);
    setDirectoryQuery("");
    setSelectedId(null);
    setOrigin(communities[0]);
    setMatrixNonce(0);
    setFocusToken((t) => t + 1);
    setRoute(null);
  };
  const useLocation = () => {
    setOriginError("");
    if (!navigator.geolocation) {
      setOriginError(
        "Geolocation is unavailable. Choose a sample community or map point.",
      );
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        if (
          p.coords.latitude < 31.2 ||
          p.coords.latitude > 31.8 ||
          p.coords.longitude < 74 ||
          p.coords.longitude > 74.7
        ) {
          setOriginError(
            "Your location is outside the Lahore study area. Nothing was stored.",
          );
          return;
        }
        chooseOrigin({
          id: "device-origin",
          name: "Your location (not stored)",
          lat: p.coords.latitude,
          lng: p.coords.longitude,
          side: p.coords.latitude > 31.609 ? "north" : "south",
        });
      },
      () =>
        setOriginError(
          "Location permission declined or unavailable. You can still select a community.",
        ),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  };
  const directory = facilities
    .filter(
      (f) =>
        (!northOnly || f.side === "north") &&
        (!verifiedOnly || f.clinicalStatus === "confirmed") &&
        f.name.toLowerCase().includes(directoryQuery.toLowerCase()),
    )
    .sort((a, b) => {
      const ma = matrix.find((m) => m.facilityId === a.id)?.durationSec,
        mb = matrix.find((m) => m.facilityId === b.id)?.durationSec;
      return (ma ?? Infinity) - (mb ?? Infinity);
    });
  const markerFacilities = facilities.filter(
    (f) =>
      (!northOnly || f.side === "north") &&
      (!verifiedOnly || f.clinicalStatus === "confirmed"),
  );
  const activeScenario = scenario.closure
    ? "Crossing unavailable"
    : scenario.delay
      ? "Crossing +20 min"
      : scenario.upgrade
        ? "THQ capability upgrade"
        : "Baseline model";
  const routeHasTraffic = !!route?.intervals.length;
  const difference = route
    ? delaySeconds(route.durationSec, route.staticSec)
    : null;
  const fastest = fastestRoute(matrix);
  const fastestHospital = fastest
    ? facilities.find((f) => f.id === fastest.facilityId)
    : null;
  const comparedCount = matrix.filter((i) => fastestRoute([i])).length;
  const compareRoutes = () => {
    setAtlasActive(true);
    setMatrixNonce((n) => n + 1);
    if (!MAPS_DEMO) setRefreshNonce((n) => n + 1);
    setModal(API && mapMode === "google" ? "routes" : "traffic");
  };
  return (
    <>
      <ProductExperience
        origin={origin}
        automaticRoute={
          matrixStatus === "loading" || mapMode === "loading"
            ? "Comparing traffic-aware routes..."
            : fastest && fastestHospital
              ? `Quickest returned route: ${fastestHospital.name} / ${Math.round(fastest.durationSec! / 60)} min / ${miles(fastest.distanceMeters!)} mi`
              : matrixStatus === "waiting"
                ? "Open Venomap to compare driving routes."
                : matrixError || "Driving comparison unavailable. Try again."
        }
        comparisonScope={`${comparedCount} of ${candidates.length} user-listed hospitals returned routes. Antivenom stock unconfirmed.`}
        onFastest={() => {
          if (fastestHospital) select(fastestHospital);
        }}
        hasFastest={!!fastest}
        facilities={directory}
        selectedId={selectedId}
        directoryQuery={directoryQuery}
        onDirectoryQuery={setDirectoryQuery}
        onSelect={select}
        onOpen={setModal}
        onHome={reset}
        onCompare={compareRoutes}
        onTraffic={toggleTraffic}
        traffic={traffic}
        mapMode={mapMode}
        northOnly={northOnly}
        verifiedOnly={verifiedOnly}
        onNorth={() => setNorthOnly((v) => !v)}
        onVerified={() => setVerifiedOnly((v) => !v)}
        onAll={() => {
          setNorthOnly(false);
          setVerifiedOnly(false);
        }}
        dataSource={dataSource}
        dataError={dataError}
        awsStatus={awsStatus}
        mapSection={mapSection}
        map={
          <LiveTrafficMap
            facilities={markerFacilities}
            origin={origin}
            selected={selected}
            onSelect={select}
            onOrigin={choosePoint}
            traffic={traffic}
            journey={journey}
            liveRoute={route}
            coverage={coverage}
            showZones={showZones}
            onMode={setMapMode}
            focusToken={focusToken}
          />
        }
        popup={
          selected && (
            <DataLineageFlip
              facility={selected}
              datasetVersion={dataset?.version || "loading"}
              dataSource={dataSource}
              journey={journey}
              liveRoute={route}
              onClose={() => setSelectedId(null)}
              onRoute={() => {
                setRefreshNonce((n) => n + 1);
                if (!API || mapMode !== "google") {
                  setNotice(
                    "Live driving routes are not configured. The dashed line is an illustrative planning path.",
                  );
                  setModal("traffic");
                }
              }}
              routing={routeStatus === "loading"}
            />
          )
        }
      />
      {notice && (
        <div className="toast" role="status">
          {notice}
          <button
            aria-label="Dismiss notification"
            onClick={() => setNotice("")}
          >
            <X size={14} />
          </button>
        </div>
      )}
      {modal && (
        <Dialog
          title={
            {
              routes: "Compare the way to care",
              origin: "Choose your starting point",
              traffic: "Road access intelligence",
              planner: "Infrastructure changes access.",
              photo: "AI Species Helper",
              data: "Behind the map.",
              architecture: "One product. Clear service boundaries.",
              aws: "Discover nearby.",
              privacy: "Privacy & location choices",
              terms: "Terms & responsible use",
            }[modal]
          }
          onClose={close}
        >
          {modal === "routes" && (
            <RouteComparison
              facilities={candidates.map((id) =>
                facilities.find((f) => f.id === id)!,
              )}
              items={matrix}
              status={matrixStatus}
              error={matrixError}
              refreshedAt={refreshedAt}
              onRefresh={compareRoutes}
              onSelect={(f) => {
                select(f);
                setModal(null);
                mapSection.current?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                });
              }}
            />
          )}
          {modal === "origin" && (
            <>
              <p className="intro-text">
                Choose a sample community, select a point on the map, or
                explicitly request your browser location.
              </p>
              <div className="origin-search">
                <Search size={16} />
                <input
                  aria-label="Search sample communities"
                  placeholder="Search Lahore sample communities…"
                  value={originQuery}
                  onChange={(e) => setOriginQuery(e.target.value)}
                />
              </div>
              <div className="community-grid">
                {communities
                  .filter((c) =>
                    c.name.toLowerCase().includes(originQuery.toLowerCase()),
                  )
                  .map((c) => (
                    <button key={c.id} onClick={() => chooseOrigin(c)}>
                      <MapPin size={18} />
                      <strong>{c.name}</strong>
                      <small>
                        {c.side === "north"
                          ? "North Ravi planning group"
                          : "Lahore planning group"}
                      </small>
                      <ArrowUpRight size={15} />
                    </button>
                  ))}
              </div>
              <button className="outline-button" onClick={useLocation}>
                <LocateFixed size={15} />
                Use my current location (ask permission)
              </button>
              <button className="text-button" onClick={() => setModal("aws")}>
                Search beyond samples with AWS
                <Search size={13} />
              </button>
              {originError && (
                <p className="error-message" role="alert">
                  {originError}
                </p>
              )}
              <p className="fine-print">
                Community coordinates are approximate research anchors. Device
                location is kept only in session memory.
              </p>
            </>
          )}
          {modal === "aws" && (
            <AWSLocationDiscovery
              origin={origin}
              places={awsPlaces}
              status={awsStatus}
              error={awsError}
              radius={radius}
              onRadius={setRadius}
              onSearch={(s) => void searchAws(s)}
              facilities={facilities}
              onSelect={(f) => {
                select(f);
                setModal(null);
              }}
              searchedAt={awsTime}
            />
          )}
          {modal === "planner" && (
            <>
              <p className="intro-text">
                Explore geographic access under explicit assumptions. This is an
                independent illustrative model, separate from Google traffic and
                medical capability verification.
              </p>
              <div className="scenario-options">
                {[
                  {
                    key: "delay" as const,
                    title: "Ravi crossing +20 minutes",
                    body: "Hypothetical delay on modeled journeys that pass through the selected crossing.",
                  },
                  {
                    key: "closure" as const,
                    title: "Selected crossing unavailable",
                    body: "Remove crossing-dependent model connections. No road detour is calculated.",
                  },
                  {
                    key: "upgrade" as const,
                    title: "Shahdara Town THQ capability upgrade",
                    body: "Make this existing candidate eligible in the planning model. No real upgrade or stock is asserted.",
                  },
                ].map((s) => (
                  <button
                    key={s.key}
                    className={scenario[s.key] ? "enabled" : ""}
                    aria-pressed={scenario[s.key]}
                    onClick={() =>
                      setScenario((v) => ({ ...v, [s.key]: !v[s.key] }))
                    }
                  >
                    <span className="scenario-check">
                      {scenario[s.key] && <Check size={14} />}
                    </span>
                    <span>
                      <strong>{s.title}</strong>
                      <small>{s.body}</small>
                    </span>
                  </button>
                ))}
              </div>
              <label className="threshold-control">
                Planning threshold
                <select
                  aria-label="Planning threshold"
                  value={scenario.threshold}
                  onChange={(e) =>
                    setScenario((v) => ({
                      ...v,
                      threshold: Number(e.target.value),
                    }))
                  }
                >
                  {[10, 15, 20, 30, 45].map((n) => (
                    <option key={n} value={n}>
                      {n} minutes
                    </option>
                  ))}
                </select>
              </label>
              <div className="planning-result">
                <div>
                  <span>Baseline</span>
                  <strong>{Math.round(coverage.baseline)}%</strong>
                </div>
                <ArrowRight size={23} />
                <div>
                  <span>Current scenario</span>
                  <strong>{Math.round(coverage.current)}%</strong>
                </div>
                <p>
                  {coverage.covered} / {coverage.count} sampled communities
                  within {scenario.threshold} minutes
                </p>
              </div>
              <div className="community-access-list">
                {coverage.rows.map((r) => (
                  <div key={r.community.id}>
                    <span>{r.community.name}</span>
                    <small>
                      {r.before === null
                        ? "No model path"
                        : `${Math.round(r.before)} min`}{" "}
                      →{" "}
                      {r.after === null
                        ? "No model path"
                        : `${Math.round(r.after)} min`}
                    </small>
                    <span className={r.covered ? "covered" : "outside"}>
                      {r.covered ? "Within" : "Outside"}
                    </span>
                  </div>
                ))}
              </div>
              <details className="model-details">
                <summary>How this model works</summary>
                <p>
                  Each path uses geographic segments, a{" "}
                  {ASSUMPTIONS.detourFactor}× detour factor,{" "}
                  {ASSUMPTIONS.speedKmh} km/h assumed speed and{" "}
                  {ASSUMPTIONS.accessMinutes} minutes of access overhead.
                  North/south journeys use one selected Ravi crossing anchor.
                  Baseline eligibility is an explicit illustrative subset of
                  hospitals, not confirmed snakebite capability. Highlight
                  circles mark sampled communities; they are not travel-time
                  polygons. Coverage is unweighted community count, not
                  population coverage.
                </p>
              </details>
              <button
                className="outline-button"
                onClick={() =>
                  setScenario({
                    delay: false,
                    closure: false,
                    upgrade: false,
                    threshold: 20,
                  })
                }
              >
                <RefreshCw size={14} />
                Restore baseline
              </button>
            </>
          )}
          {modal === "traffic" && (
            <>
              <p className="intro-text">
                Google Maps visualizes available road traffic. The separate
                Google Routes API supplies programmatic route estimates and
                speed intervals when returned.
              </p>
              {MAPS_DEMO && (
                <p className="notice">
                  This is quota-limited prototype access. Comparisons are
                  requested on demand; the provider pauses requests when its
                  demo limit is reached.
                </p>
              )}
              <div className="provider-status-grid">
                <div>
                  <span>Map canvas</span>
                  <strong>
                    {mapMode === "google"
                      ? "Google Maps initialized"
                      : mapMode === "loading"
                        ? "Loading"
                        : "Demo map · OpenStreetMap"}
                  </strong>
                </div>
                <div>
                  <span>Traffic overlay</span>
                  <strong>
                    {mapMode === "google"
                      ? traffic
                        ? "Requested on map"
                        : "Off"
                      : "Unavailable without Google Maps"}
                  </strong>
                </div>
                <div>
                  <span>Route service</span>
                  <strong>
                    {routeStatus === "connected"
                      ? "Real response received"
                      : routeStatus === "loading"
                        ? "Requesting estimate"
                        : routeError || "Not connected"}
                  </strong>
                </div>
                <div>
                  <span>Route-specific traffic</span>
                  <strong>
                    {routeHasTraffic
                      ? `${route!.intervals.length} provider intervals`
                      : "No intervals returned"}
                  </strong>
                </div>
              </div>
              <div className="traffic-controls">
                <button
                  className="dark-button"
                  onClick={() => {
                    if (mapMode === "google") setTraffic((v) => !v);
                    else
                      setNotice(
                        "Configure a restricted Google Maps browser key to enable traffic.",
                      );
                  }}
                >
                  {traffic ? "Hide" : "Enable"} traffic layer
                  <Activity size={15} />
                </button>
                <button
                  className="outline-button"
                  disabled={routeStatus === "loading"}
                  onClick={() => {
                    setRefreshNonce((n) => n + 1);
                    if (!API)
                      setNotice(
                        "A protected Routes backend is required. No live request was sent.",
                      );
                  }}
                >
                  <RefreshCw size={14} />
                  Refresh estimate
                </button>
              </div>
              {route && (
                <div className="live-route-details">
                  <h3>Selected route · Google Maps</h3>
                  <p>
                    {Math.round(route.durationSec / 60)} min ·{" "}
                    {(route.distanceMeters / 1000).toFixed(1)} km
                  </p>
                  <p>
                    {difference !== null
                      ? `${Math.round(difference / 60)} min approximate difference from provider static baseline`
                      : "Static baseline not returned"}
                  </p>
                  <small>
                    Calculated {new Date(route.calculatedAt).toLocaleString()}.
                    Overlay and route updates are independent.
                  </small>
                </div>
              )}
              <p className="safety-note">
                TrafficLayer does not expose a downloadable congestion dataset.
                Estimates are not ambulance response times. Live traffic
                coverage varies by road and provider. Automatic route refresh,
                when configured and visible, is limited to once every{" "}
                {Math.round(REFRESH_MS / 60000)} minutes.
              </p>
            </>
          )}
          {modal === "photo" && <SnakePhotoAssistant />}
          {modal === "data" && (
            <>
              <p className="intro-text">
                Google maps the journey. Public records locate the care.
              </p>
              <div className="source-summary glass-panel">
                <div>
                  <span>Map & driving routes</span>
                  <strong>Google Maps</strong>
                </div>
                <div>
                  <span>Location discovery</span>
                  <strong>Amazon Location</strong>
                </div>
                <div>
                  <span>Saved hospital coordinates</span>
                  <strong>OpenStreetMap + Punjab records</strong>
                </div>
              </div>
              <p className="clinical-note">
                Treatment capability and antivenom stock are unconfirmed.
              </p>
              <details className="source-details">
                <summary>Dataset & technical details</summary>
                <p>
                  {facilities.length} independent records � {communities.length}{" "}
                  sample communities.
                </p>
                <p>{dataSource}</p>
                <p>
                  Dataset {dataset?.version || "loading"}. Source review does
                  not confirm clinical capability. UVAS is reference-only.
                </p>
              </details>
              <details className="source-details">
                <summary>Browse location records</summary>
                <div className="source-records">
                  {facilities.map((f) => (
                    <div key={f.id}>
                      <span>{f.name}</span>
                      <a
                        href={f.coordinateSource}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Coordinate source
                        <ArrowUpRight size={11} />
                      </a>
                      <button
                        onClick={() => {
                          select(f);
                          setModal(null);
                        }}
                      >
                        Inspect
                        <Code2 size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              </details>
              <a
                className="download-link"
                href={`${import.meta.env.BASE_URL}data/facilities.json`}
                download
              >
                <Database size={14} />
                Download independent snapshot
                <ArrowDown size={14} />
              </a>
            </>
          )}
          {modal === "architecture" && (
            <>
              <p className="intro-text">
                AWS discovers geographic candidates and serves independent data.
                Google handles its own map and route content. The planning model
                remains independently reproducible.
              </p>
              <div className="architecture-flow">
                {[
                  {
                    icon: Cloud,
                    title: "AWS-native discovery",
                    body: "Browser → API Gateway → Lambda → Amazon Location SearchNearby / SearchText. Ephemeral attributed results.",
                  },
                  {
                    icon: Database,
                    title: "Independent data",
                    body: "Public records → Python validation → private S3 → Lambda. Optional Glue / Iceberg and Athena are deployment extensions.",
                  },
                  {
                    icon: Navigation,
                    title: "Google traffic & routes",
                    body: "Google Maps JavaScript + TrafficLayer. A Secrets Manager-backed Lambda proxy calls Compute Routes. Demo-key comparisons use up to five supported route calls on demand; the billing-only matrix API is not used.",
                  },
                  {
                    icon: GitBranch,
                    title: "Geographic what-if model",
                    body: "Independent coordinates + declared speed, detour and eligibility assumptions → sample-community coverage.",
                  },
                ].map(({ icon: Icon, title, body }) => (
                  <div key={title}>
                    <Icon size={22} />
                    <div>
                      <h3>{title}</h3>
                      <p>{body}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="provider-status-grid">
                <div>
                  <span>Amazon Location</span>
                  <strong>
                    {awsStatus === "connected"
                      ? "Real response received"
                      : awsStatus === "searching"
                        ? "Request in progress"
                        : "Not verified live"}
                  </strong>
                </div>
                <div>
                  <span>Independent dataset</span>
                  <strong>{dataSource}</strong>
                </div>
                <div>
                  <span>Google Maps</span>
                  <strong>
                    {mapMode === "google"
                      ? "Initialized"
                      : "Not configured / unavailable"}
                  </strong>
                </div>
                <div>
                  <span>AI / Athena / Iceberg</span>
                  <strong>Not deployed</strong>
                </div>
              </div>
              <button className="dark-button" onClick={() => setModal("aws")}>
                Inspect AWS discovery
                <ArrowUpRight size={14} />
              </button>
            </>
          )}
          {modal === "privacy" && (
            <>
              <p>
                VenomLink does not require an account. Sample origins and
                scenario selections stay in browser memory. Precise device
                location is requested only after you click its consent action;
                the app does not persist it.
              </p>
              <p>
                When live services are configured, origin coordinates and search
                text are transmitted to the configured AWS backend and relevant
                mapping providers to fulfill your request. Google Maps may
                process map-view information under its own policy. No snake
                photos are uploaded by the current sample helper.
              </p>
              <p>
                The backend is configured not to log request bodies or
                coordinates. Infrastructure providers may retain operational
                metadata under their own terms. Avoid entering names, health
                histories or patient identifiers.
              </p>
              <div className="legal-links">
                <a
                  href="https://policies.google.com/privacy"
                  target="_blank"
                  rel="noreferrer"
                >
                  Google Privacy Policy ↗
                </a>
                <a
                  href="https://aws.amazon.com/privacy/"
                  target="_blank"
                  rel="noreferrer"
                >
                  AWS Privacy Notice ↗
                </a>
              </div>
            </>
          )}
          {modal === "terms" && (
            <>
              <p>
                VenomLink is a geographic planning and navigation-support
                prototype. It is not an ambulance dispatch service or clinically
                validated decision system. Facility discovery and travel
                estimates do not establish care availability.
              </p>
              <p>
                Planning values are calculated from stated illustrative
                assumptions. No antivenom recommendation, diagnosis or
                harmlessness determination is provided. Contact appropriate
                local healthcare services for actual care decisions.
              </p>
              <p>
                Map and route services are governed by their provider terms.
                Independent OSM-derived coordinates retain ODbL attribution.
                Public document facts are attributed without asserting a broad
                reuse license for the underlying documents.
              </p>
              <div className="legal-links">
                <a
                  href="https://maps.google.com/help/terms_maps/"
                  target="_blank"
                  rel="noreferrer"
                >
                  Google Maps Terms ↗
                </a>
                <a
                  href="https://aws.amazon.com/service-terms/"
                  target="_blank"
                  rel="noreferrer"
                >
                  AWS Service Terms ↗
                </a>
                <a
                  href="https://www.openstreetmap.org/copyright"
                  target="_blank"
                  rel="noreferrer"
                >
                  OpenStreetMap attribution ↗
                </a>
              </div>
            </>
          )}
        </Dialog>
      )}
    </>
  );
}
