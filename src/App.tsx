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
import { CoverageGauge } from "./components/CoverageGauge";
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
    [traffic, setTraffic] = useState(false),
    [showZones, setShowZones] = useState(true),
    [mapMode, setMapMode] = useState<MapMode>("loading"),
    [focusToken, setFocusToken] = useState(0),
    [modal, setModal] = useState<Modal>(null),
    [directoryQuery, setDirectoryQuery] = useState(""),
    [originQuery, setOriginQuery] = useState(""),
    [originError, setOriginError] = useState(""),
    [notice, setNotice] = useState(""),
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
    const hospitals = facilities.filter((f) => f.kind === "human-hospital");
    const confirmed = hospitals.filter((f) => f.clinicalStatus === "confirmed");
    return [...(confirmed.length ? confirmed : hospitals)]
      .sort((a, b) => haversine(origin, a) - haversine(origin, b))
      .slice(0, MAPS_DEMO ? 5 : 12)
      .map((f) => f.id);
  }, [dataset, origin]);
  useEffect(() => {
    const c = new AbortController();
    setMatrix([]);
    setMatrixError("");
    if (!API || mapMode !== "google" || !candidates.length) {
      setMatrixStatus("unavailable");
      return;
    }
    if (MAPS_DEMO && matrixNonce === 0) {
      setMatrixStatus("on-demand");
      return;
    }
    const timer = setTimeout(async () => {
      setMatrixStatus("loading");
      try {
        const d = await routeMatrix(origin, candidates, c.signal);
        if (!c.signal.aborted) {
          setMatrix(d.items);
          setRefreshedAt(d.calculatedAt);
          const usable = d.items.some((i) => i.durationSec !== null);
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
  }, [origin, candidates, mapMode, MAPS_DEMO ? matrixNonce : refreshNonce]);
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
  return (
    <div className="app-shell">
      <header className="main-header">
        <button className="brand" onClick={reset} aria-label="VenomLink home">
          <span className="brand-mark">
            <Diamond size={20} />
            <span />
          </span>
          <strong>VENOMLINK</strong>
          <small>LAHORE / PK</small>
        </button>
        <nav aria-label="Main navigation">
          {[
            { label: "Care Finder", value: null },
            { label: "Live Traffic", value: "traffic" },
            { label: "Planner Simulator", value: "planner" },
            { label: "Photo AI Assistant", value: "photo" },
            { label: "S3 / Iceberg Data", value: "data" },
            { label: "AWS Architecture", value: "architecture" },
          ].map((n) => (
            <button
              key={n.label}
              className={modal === n.value ? "active" : ""}
              onClick={() => {
                setModal(n.value as Modal);
                if (n.value === null)
                  mapSection.current?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  });
              }}
            >
              {n.label}
            </button>
          ))}
        </nav>
      </header>
      <main>
        <section className="page-heading">
          <div>
            <p className="eyebrow">
              GEOGRAPHIC INTELLIGENCE. HUMAN CONSEQUENCES.
            </p>
            <h1>
              Snakebite Care & Access Atlas<span>↗</span>
            </h1>
            <p>Explore emergency healthcare accessibility across Lahore.</p>
          </div>
          <div className="mode-pill">
            <span
              className={
                awsStatus === "connected"
                  ? "status-dot connected"
                  : "status-dot"
              }
            />
            {awsStatus === "connected"
              ? "AWS discovery connected"
              : MAPS_DEMO
                ? "Prototype · Maps Demo Key"
                : "Demo Mode"}
            <button
              onClick={() => setModal("architecture")}
              aria-label="View connection details"
            >
              <Info size={13} />
            </button>
          </div>
        </section>
        <div className="filter-bar">
          <div className="filter-pills">
            <button
              className={!northOnly ? "active" : ""}
              onClick={() => setNorthOnly(false)}
            >
              <Globe2 size={13} />
              All Lahore
            </button>
            <button
              className={northOnly ? "active" : ""}
              onClick={() => setNorthOnly((v) => !v)}
            >
              North of Ravi
            </button>
            <button
              className={scenario.delay || scenario.closure ? "active" : ""}
              onClick={() => setModal("planner")}
            >
              <GitBranch size={13} />
              Bridge Scenario
            </button>
            <button
              className={verifiedOnly ? "active" : ""}
              onClick={() => setVerifiedOnly((v) => !v)}
              title="Filter by independently confirmed clinical capability"
            >
              <ShieldCheck size={13} />
              Verified Only
            </button>
            <button
              className={traffic && mapMode === "google" ? "active" : ""}
              onClick={toggleTraffic}
            >
              <Activity size={13} />
              Traffic Overlay
            </button>
          </div>
          <button className="text-button" onClick={() => setModal("data")}>
            <Database size={13} />
            Sources & limitations
            <ArrowUpRight size={12} />
          </button>
        </div>
        <section className="summary-grid" aria-label="Explore the atlas">
          <article className="summary-card card">
            <div className="summary-content">
              <span className="eyebrow">01 / YOUR STARTING POINT</span>
              <h2>
                {origin.id === "shahdara"
                  ? "Shahdara & North Ravi"
                  : origin.name}
              </h2>
              <p>Select your origin · Explore nearby care</p>
              <button className="small-dark" onClick={() => setModal("origin")}>
                Choose community
                <ArrowUpRight size={13} />
              </button>
            </div>
            <div className="location-art" aria-hidden="true">
              <svg viewBox="0 0 140 140">
                <path d="M-5 40L145 95M-5 70L145 125M20 -5L80 145M70 -5L130 145" />
                <path className="art-river" d="M-5 5Q90 45 60 80T130 145" />
                <circle cx="78" cy="64" r="22" />
                <circle cx="78" cy="64" r="7" />
              </svg>
              <MapPin size={28} />
            </div>
          </article>
          <article className="summary-card traffic-summary card">
            <div className="summary-content">
              <span className="eyebrow">02 / THE WAY THERE</span>
              <h2>Road Access Intelligence</h2>
              <p>
                {mapMode === "google"
                  ? "Traffic overlay available · Routes via backend"
                  : "Traffic unavailable · Planning model ready"}
              </p>
              <button
                className="small-dark"
                onClick={() => setModal("planner")}
              >
                Open planner
                <ArrowUpRight size={13} />
              </button>
            </div>
            <div className="route-art" aria-hidden="true">
              <svg viewBox="0 0 150 140">
                <path d="M10 115L50 115Q70 115 70 95V55Q70 35 90 35H130" />
                <circle cx="10" cy="115" r="9" />
                <circle cx="130" cy="35" r="12" />
              </svg>
              <span>WHAT IF?</span>
            </div>
          </article>
          <article className="summary-card photo-summary card">
            <div className="summary-content">
              <span className="eyebrow">03 / OPTIONAL ASSISTANCE</span>
              <h2>AI Species Helper</h2>
              <p>A photo should never delay finding care.</p>
              <button
                className="small-outline"
                onClick={() => setModal("photo")}
              >
                View sample profiles
                <ArrowUpRight size={13} />
              </button>
            </div>
            <div className="snake-art" aria-hidden="true">
              <svg viewBox="0 0 140 140">
                <path d="M28 105Q120 125 102 80Q92 54 67 75Q45 97 90 96Q120 95 100 55Q77 19 87 17Q107 18 105 40" />
                <circle cx="103" cy="28" r="2" />
              </svg>
            </div>
          </article>
        </section>
        {!dataset && !dataError && (
          <div className="dataset-warning" role="status">
            <RefreshCw size={15} className="spin" />
            Loading independent facility records…
          </div>
        )}
        {dataError && (
          <div className="dataset-warning" role="status">
            <Info size={15} />
            {dataError}
          </div>
        )}
        <section className="dashboard-grid">
          <section className="map-card card" ref={mapSection}>
            <div className="map-card-header">
              <div>
                <span className="eyebrow">EXPLORE / COMPARE / UNDERSTAND</span>
                <h2>
                  Map Session<span>— Lahore Care Access & Routing</span>
                </h2>
              </div>
              <div className="map-actions">
                <button
                  className={showZones ? "icon-button active" : "icon-button"}
                  onClick={() => setShowZones((v) => !v)}
                  aria-label="Toggle modeled community highlights"
                  aria-pressed={showZones}
                >
                  <Layers size={17} />
                </button>
                <button
                  className="icon-button"
                  onClick={reset}
                  aria-label="Reset map and scenarios"
                >
                  <RefreshCw size={16} />
                </button>
              </div>
            </div>
            <div className="map-stage">
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
              {selected && (
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
              )}
              <div className="community-label">
                <MapPin size={13} />
                {origin.name}
                <span>Selected origin</span>
              </div>
            </div>
            <div className="map-footer">
              <div className="map-legend">
                <span>
                  <i className="legend-origin" />
                  Origin
                </span>
                <span>
                  <i className="legend-facility" />
                  Independent facility
                </span>
                <span>
                  <i className="legend-reference" />
                  Reference only
                </span>
              </div>
              <button onClick={() => setModal("aws")} className="aws-link">
                <Cloud size={14} />
                AWS Location Discovery
                <ArrowUpRight size={12} />
              </button>
            </div>
            <div className="scenario-strip">
              <span className="scenario-tag">
                <GitBranch size={13} />
                {activeScenario}
              </span>
              <span>
                Estimated Care-Access Zones = sampled-community highlights, not
                isochrones
              </span>
              <button onClick={() => setModal("planner")}>
                Adjust model
                <Settings2 size={12} />
              </button>
            </div>
          </section>
          <aside className="right-column">
            {dataset ? (
              <CoverageGauge
                coverage={coverage}
                scenario={scenario}
                onExplain={() => setModal("planner")}
              />
            ) : (
              <section className="coverage-card card" role="status">
                <h2>Care-Access Status</h2>
                <p>
                  {dataError
                    ? "Facility data unavailable. Reload to retry."
                    : "Loading independent records before calculating access…"}
                </p>
              </section>
            )}
            <section className="directory-card">
              <div className="directory-heading">
                <div>
                  <span className="eyebrow">
                    A DIRECTORY, NOT A RECOMMENDATION
                  </span>
                  <h2>Facilities & Geographic Access</h2>
                </div>
                <span className="directory-count">{directory.length}</span>
              </div>
              <label className="directory-search">
                <Search size={13} />
                <input
                  aria-label="Search facility directory"
                  placeholder="Find a facility…"
                  value={directoryQuery}
                  onChange={(e) => setDirectoryQuery(e.target.value)}
                />
              </label>
              <div className="directory-rows">
                {directory.map((f) => {
                  const item = matrix.find((m) => m.facilityId === f.id);
                  const j = planJourney(origin, f, scenario);
                  return (
                    <button
                      key={f.id}
                      className={`directory-row ${selectedId === f.id ? "selected" : ""}`}
                      onClick={() => select(f)}
                    >
                      <span className="facility-icon">
                        {f.kind === "reference" ? (
                          <MapPin size={15} />
                        ) : (
                          <Hospital size={15} />
                        )}
                      </span>
                      <span className="directory-name">
                        <strong>{f.name}</strong>
                        <small>
                          {f.neighborhood} ·{" "}
                          {f.kind === "reference"
                            ? "Reference only"
                            : "Care suitability unknown"}
                        </small>
                      </span>
                      <span className="directory-eta">
                        {item?.durationSec !== null &&
                        item?.durationSec !== undefined
                          ? `${Math.round(item.durationSec / 60)}m`
                          : f.kind === "reference"
                            ? "REF"
                            : j.available
                              ? `~${Math.round(j.minutes)}m`
                              : "—"}
                        <small>
                          {item?.durationSec !== null &&
                          item?.durationSec !== undefined
                            ? "Google"
                            : "model"}
                        </small>
                      </span>
                    </button>
                  );
                })}
                {!directory.length && (
                  <div className="empty-directory">
                    <ShieldQuestion size={24} />
                    <strong>
                      {!dataset
                        ? dataError
                          ? "Facility records unavailable."
                          : "Loading facility records…"
                        : verifiedOnly
                          ? "No matching verified facilities."
                          : "No matching facilities."}
                    </strong>
                    <p>
                      {!dataset
                        ? "Source records must load before this directory can be explored."
                        : verifiedOnly
                          ? "No snakebite-treatment capabilities have been independently confirmed in this dataset. Turn off Verified Only to inspect source-linked candidates."
                          : "Try another name or clear the geographic filter."}
                    </p>
                  </div>
                )}
              </div>
              <footer>
                <span>
                  <i />
                  Independent public records
                </span>
                <button onClick={() => setModal("data")}>
                  View lineage
                  <ArrowUpRight size={12} />
                </button>
              </footer>
            </section>
          </aside>
        </section>
        <section className="bottom-grid">
          <article className="comparison-card card">
            <div className="card-heading">
              <div>
                <span className="eyebrow">
                  PROXIMITY IS ONLY PART OF THE STORY
                </span>
                <h2>Compare the way to care</h2>
              </div>
              <button
                className="outline-button"
                onClick={() => {
                  setMatrixNonce((n) => n + 1);
                  if (!MAPS_DEMO) setRefreshNonce((n) => n + 1);
                  if (!API || mapMode !== "google") setModal("traffic");
                }}
                disabled={matrixStatus === "loading"}
              >
                <RefreshCw
                  size={13}
                  className={matrixStatus === "loading" ? "spin" : ""}
                />
                {MAPS_DEMO ? "Compare 5 routes" : "Refresh routes"}
              </button>
            </div>
            <div className="route-status">
              <span
                className={
                  matrixStatus === "connected"
                    ? "status-dot connected"
                    : "status-dot"
                }
              />
              {matrixStatus === "connected"
                ? `Google Maps driving estimates · ${refreshedAt ? new Date(refreshedAt).toLocaleTimeString() : ""}`
                : matrixStatus === "loading"
                  ? "Comparing candidate driving routes…"
                  : matrixStatus === "on-demand"
                    ? "Request a comparison when needed. Demo-key usage limits apply."
                    : matrixError ||
                      "Live driving estimates unavailable. Illustrative model shown separately."}
            </div>
            <div className="comparison-table">
              <table>
                <thead>
                  <tr>
                    <th>Potential facility</th>
                    <th>Driving ETA</th>
                    <th>Distance</th>
                    <th>Care status</th>
                  </tr>
                </thead>
                <tbody>
                  {candidates
                    .map((id) => facilities.find((f) => f.id === id)!)
                    .sort(
                      (a, b) =>
                        (matrix.find((m) => m.facilityId === a.id)
                          ?.durationSec ?? Infinity) -
                        (matrix.find((m) => m.facilityId === b.id)
                          ?.durationSec ?? Infinity),
                    )
                    .map((f) => {
                      const m = matrix.find((m) => m.facilityId === f.id);
                      return (
                        <tr key={f.id} onClick={() => select(f)}>
                          <td>
                            <button onClick={() => select(f)}>
                              {f.name}
                              <ArrowUpRight size={11} />
                            </button>
                          </td>
                          <td>
                            {m?.durationSec !== null &&
                            m?.durationSec !== undefined
                              ? `${Math.round(m.durationSec / 60)} min`
                              : "Unavailable"}
                          </td>
                          <td>
                            {m?.distanceMeters !== null &&
                            m?.distanceMeters !== undefined
                              ? `${(m.distanceMeters / 1000).toFixed(1)} km`
                              : "—"}
                          </td>
                          <td>
                            <span>Confirm directly</span>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
            <p className="fine-print">
              Candidates are chosen by geographic proximity; returned routes are
              sorted by driving time. Rank by travel time only after suitable
              care is established. A fast route does not confirm treatment
              availability.
            </p>
          </article>
          <article className="planner-teaser card">
            <span className="eyebrow">ONE CROSSING. MANY CONSEQUENCES.</span>
            <h2>
              What changes
              <br />
              when the bridge slows?
            </h2>
            <p>
              Test a disruption. Explore a facility upgrade. See which sample
              communities gain or lose access.
            </p>
            <button className="dark-button" onClick={() => setModal("planner")}>
              Explore the what-if
              <ArrowUpRight size={14} />
            </button>
            <GitBranch className="teaser-icon" size={110} />
          </article>
        </section>
        <section className="disclosure-bar">
          <ShieldQuestion size={18} />
          <p>
            <strong>A planning and navigation-support prototype.</strong>{" "}
            Clinical suitability, antivenom stock and operating capacity require
            direct confirmation. Illustrative model times use stated
            assumptions; Google-labelled driving estimates use provider
            responses.
          </p>
          <button onClick={() => setModal("data")}>
            Understand the data
            <ArrowUpRight size={12} />
          </button>
        </section>
      </main>
      <footer className="site-footer">
        <span>
          ◈ VENOMLINK <small>Built by Muhammad Sheheryar · UVAS, Lahore</small>
        </span>
        <div>
          <button onClick={() => setModal("privacy")}>Privacy</button>
          <button onClick={() => setModal("terms")}>Terms</button>
          <a
            href={`${import.meta.env.BASE_URL}demo.html`}
            target="_blank"
            rel="noreferrer"
          >
            Demo video ↗
          </a>
          <a
            href="https://www.figma.com/design/YW6WtWs7SMQb0aGdPstddh"
            target="_blank"
            rel="noreferrer"
          >
            Design ↗
          </a>
          <a
            href="https://github.com/shehar-e-yaar/venomlink"
            target="_blank"
            rel="noreferrer"
          >
            Source ↗
          </a>
        </div>
      </footer>
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
              origin: "Choose your starting point",
              traffic: "Road access intelligence",
              planner: "Infrastructure changes access.",
              photo: "AI Species Helper",
              data: "Every record has a source.",
              architecture: "One product. Clear service boundaries.",
              aws: "AWS Location Discovery",
              privacy: "Privacy & location choices",
              terms: "Terms & responsible use",
            }[modal]
          }
          onClose={close}
        >
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
                Independent public facility records, provider discovery results
                and Google route data have distinct sources and lifecycles.
              </p>
              <div className="data-metrics">
                <div>
                  <strong>{facilities.length}</strong>
                  <span>Independent records</span>
                </div>
                <div>
                  <strong>0</strong>
                  <span>Confirmed antivenom stocks</span>
                </div>
                <div>
                  <strong>{communities.length}</strong>
                  <span>Sample communities</span>
                </div>
              </div>
              <div className="notice">
                <Database size={19} />
                <div>
                  <strong>{dataSource}</strong>
                  <p>
                    Dataset {dataset?.version || "loading"} · Ingested{" "}
                    {dataset
                      ? new Date(dataset.ingestedAt).toLocaleString()
                      : "—"}
                    . A review timestamp records source retrieval, not a
                    clinical verification.
                  </p>
                </div>
              </div>
              <h3>Location evidence is not medical suitability.</h3>
              <p>
                Hospital identities and coordinates come from OpenStreetMap and
                public Punjab government documents. All snakebite capability and
                stock fields remain unknown. UVAS is a reference institution and
                is excluded from human-care comparisons.
              </p>
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
              <a
                className="download-link"
                href={`${import.meta.env.BASE_URL}data/facilities.json`}
                download
              >
                <Database size={14} />
                Download independent snapshot
                <ArrowDown size={14} />
              </a>
              <p className="fine-print">
                No operational Iceberg or Athena table is asserted. Deployment
                configuration and ETL are supplied. Provider Places/Routes
                content is not included in the independent snapshot.
              </p>
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
    </div>
  );
}
