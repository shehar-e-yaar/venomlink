import { useRef, useState } from "react";
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
  const [query, setQuery] = useState("");
  const searchInput = useRef<HTMLInputElement>(null);
  const nearby = facilities
    .filter(
      (f) =>
        f.kind === "human-hospital" &&
        haversine(origin, f) <= radius / 1000 &&
        `${f.name} ${f.neighborhood}`
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
    )
    .sort((a, b) => haversine(origin, a) - haversine(origin, b));
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
      <p className="intro-text">Search places around {origin.name}.</p>
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
      <div
        className={`service-message ${status === "connected" && places.length ? "success" : ""}`}
        role="status"
      >
        {status === "connected"
          ? places.length
            ? `${places.length} ${places.length === 1 ? "place" : "places"} found`
            : "No nearby hospital matches"
          : status === "searching"
            ? "Calling Amazon Location…"
            : error ||
              "AWS backend not connected. No AWS results have been generated."}
      </div>
      {status === "connected" && !places.length && (
        <div className="discovery-empty glass-panel">
          <strong>Try a place name instead.</strong>
          <p>
            AWS returned no hospitals for this radius. Your saved care locations
            are still on the map.
          </p>
          <button
            className="outline-button"
            onClick={() => searchInput.current?.focus()}
          >
            Enter a hospital or area name
          </button>
        </div>
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
          ref={searchInput}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          name="query"
          aria-label="AWS place query"
          placeholder="Hospital or area name..."
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
      <section className="saved-discovery">
        <h3>Saved hospital directory</h3>
        <p>
          {nearby.length} locations within {radius / 1000} km. Independent
          records, separate from AWS search.
        </p>
        {nearby.map((f) => (
          <button
            className="saved-discovery-row"
            key={f.id}
            onClick={() => onSelect(f)}
          >
            <span>
              <strong>{f.name}</strong>
              <small>
                {haversine(origin, f).toFixed(1)} km straight-line distance /
                Demo: 10 injections
              </small>
            </span>
            <ArrowUpRight size={15} />
          </button>
        ))}
        {!nearby.length && (
          <p>
            No saved locations match. Increase the radius or clear the search.
          </p>
        )}
      </section>
      <details className="source-details">
        <summary>About these results</summary>
        <p>
          Powered by Amazon Location. Results stay in this session; they do not
          confirm treatment or antivenom availability. Possible matches require
          verification.
        </p>
        <p>
          {searchedAt
            ? `Last search: ${new Date(searchedAt).toLocaleTimeString()}`
            : "Not searched yet"}
        </p>
      </details>
    </>
  );
}
