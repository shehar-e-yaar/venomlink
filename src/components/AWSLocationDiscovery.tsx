import { Cloud, LoaderCircle, Search, ArrowUpRight, Link2 } from "lucide-react";
import type { DiscoveredPlace, Origin, Facility } from "../types";
import { haversine } from "../services/accessibilityService";
export function AWSLocationDiscovery({
  origin,
  places,
  status,
  error,
  radius,
  onRadius,
  onSearch,
  facilities,
  onSelect,
  searchedAt,
}: {
  origin: Origin;
  places: DiscoveredPlace[];
  status: string;
  error: string;
  radius: number;
  onRadius: (r: number) => void;
  onSearch: (text?: string) => void;
  facilities: Facility[];
  onSelect: (f: Facility) => void;
  searchedAt: string | null;
}) {
  const match = (p: DiscoveredPlace) =>
    facilities.find(
      (f) =>
        p.placeType === "PointOfInterest" &&
        f.kind === "human-hospital" &&
        haversine(f, { lng: p.position[0], lat: p.position[1] }) < 0.5 &&
        f.name
          .toLowerCase()
          .split(/\W+/)
          .filter(
            (w) =>
              w.length > 3 &&
              !["hospital", "teaching", "government"].includes(w),
          )
          .some((w) => p.title.toLowerCase().includes(w)),
    );
  return (
    <>
      <p className="intro-text">
        Amazon Location Places discovers geographic candidates. Discovery does
        not verify clinical capability or antivenom availability.
      </p>
      <div className="discovery-controls">
        <label>
          Search radius
          <select
            value={radius}
            onChange={(e) => onRadius(Number(e.target.value))}
          >
            {[5000, 10000, 15000, 25000].map((r) => (
              <option key={r} value={r}>
                {r / 1000} km
              </option>
            ))}
          </select>
        </label>
        <button
          className="dark-button"
          disabled={status === "searching"}
          onClick={() => onSearch()}
        >
          {status === "searching" ? (
            <LoaderCircle size={15} className="spin" />
          ) : (
            <Cloud size={16} />
          )}
          Search with AWS
        </button>
      </div>
      <p className="mono">
        QueryPosition [{origin.lng.toFixed(5)}, {origin.lat.toFixed(5)}] ·{" "}
        {origin.name}
      </p>
      <div
        className={`service-message ${status === "connected" ? "success" : ""}`}
        role="status"
      >
        {status === "connected"
          ? `${places.length} real AWS result${places.length === 1 ? "" : "s"} · ${searchedAt ? new Date(searchedAt).toLocaleTimeString() : ""}`
          : status === "searching"
            ? "Calling Amazon Location…"
            : error ||
              "AWS backend not connected. No AWS results have been generated."}
      </div>
      {status === "connected" && !places.length && (
        <p className="safety-note">
          AWS returned no matches for this query. This is a provider coverage
          result, not evidence that hospitals are absent. The independent
          facility directory remains available. Try an area name such as
          Shahdara with SearchText.
        </p>
      )}
      <form
        className="aws-text-search"
        onSubmit={(e) => {
          e.preventDefault();
          const value = new FormData(e.currentTarget).get("query");
          if (typeof value === "string" && value.trim()) onSearch(value.trim());
        }}
      >
        <Search size={15} />
        <input
          name="query"
          aria-label="AWS place query"
          placeholder="SearchText: hospital name or area…"
          maxLength={160}
        />
        <button type="submit" disabled={status === "searching"}>
          Search
        </button>
      </form>
      <div className="discovery-results">
        {places.map((p) => {
          const f = match(p);
          return (
            <article key={p.id}>
              <div>
                <span className="aws-dot" />
                <h3>{p.title}</h3>
              </div>
              <p>{p.categories.join(" · ") || "Category not returned"}</p>
              <small>
                {p.position[1].toFixed(4)}° N, {p.position[0].toFixed(4)}° E ·
                {p.placeType === "PointOfInterest"
                  ? "Clinical suitability unknown"
                  : "Geographic reference · not a treatment facility"}
              </small>
              {f ? (
                <button onClick={() => onSelect(f)}>
                  <Link2 size={12} />
                  Possible independent match: {f.name}
                  <ArrowUpRight size={12} />
                </button>
              ) : (
                <span className="unmatched">
                  No independent match confirmed
                </span>
              )}
              <footer>{p.attribution}</footer>
            </article>
          );
        })}
      </div>
      <p className="safety-note">
        SingleUse results stay in memory and this attributed list. They are not
        persisted to S3 or plotted on Google/OSM maps. Name-and-distance matches
        are provisional.
      </p>
    </>
  );
}
