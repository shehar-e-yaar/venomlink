import { useEffect, useState } from "react";
import { ArrowUpRight, Code2, Hospital, RotateCcw, X } from "lucide-react";
import type { Facility, LiveRoute, PlanningJourney } from "../types";
export function DataLineageFlip({
  facility,
  datasetVersion,
  dataSource,
  journey,
  liveRoute,
  onClose,
  onRoute,
  routing,
}: {
  facility: Facility;
  datasetVersion: string;
  dataSource: string;
  journey: PlanningJourney | null;
  liveRoute: LiveRoute | null;
  onClose: () => void;
  onRoute: () => void;
  routing: boolean;
}) {
  const [flip, setFlip] = useState(false);
  useEffect(() => setFlip(false), [facility.id]);
  return (
    <section
      className={`facility-popup ${flip ? "flipped" : ""}`}
      aria-label="Selected facility"
    >
      <div className="flip-inner">
        <div
          className="popup-face"
          aria-hidden={flip}
          {...{ inert: flip ? "" : undefined }}
        >
          <div className="popup-top">
            <span className="hospital-symbol">
              <Hospital size={20} />
            </span>
            <button
              aria-label="Close facility"
              className="icon-button"
              onClick={onClose}
            >
              <X size={15} />
            </button>
          </div>
          <span className="eyebrow">INDEPENDENT FACILITY RECORD</span>
          <h3>{facility.name}</h3>
          <p>
            {facility.neighborhood} ·{" "}
            {facility.kind === "reference"
              ? "Reference institution"
              : "Source-linked location"}
          </p>
          <div className="popup-eta">
            <strong>
              {liveRoute
                ? Math.round(liveRoute.durationSec / 60)
                : journey?.available
                  ? Math.round(journey.minutes)
                  : "—"}
              <small>{liveRoute || journey?.available ? "min" : ""}</small>
            </strong>
            <span>
              {liveRoute
                ? "Google driving estimate"
                : journey?.available
                  ? "Illustrative planning estimate"
                  : "No modeled connection"}
              <br />
              {liveRoute
                ? `${(liveRoute.distanceMeters / 1000).toFixed(1)} km`
                : journey
                  ? `${journey.distanceKm.toFixed(1)} km modeled path`
                  : ""}
            </span>
          </div>
          <div className="unknown-label">
            {facility.kind === "reference"
              ? "Not a human emergency-care facility"
              : "Snakebite capability & antivenom unconfirmed"}
          </div>
          {facility.kind === "human-hospital" && (
            <button
              className="dark-button wide"
              disabled={routing}
              onClick={onRoute}
            >
              {routing ? "Calculating…" : "Compare / refresh route"}
              <ArrowUpRight size={13} />
            </button>
          )}
          <button className="lineage-button" onClick={() => setFlip(true)}>
            <Code2 size={13} />
            View data lineage
            <RotateCcw size={12} />
          </button>
        </div>
        <div
          className="popup-face popup-back"
          aria-hidden={!flip}
          {...{ inert: !flip ? "" : undefined }}
        >
          <div className="popup-top">
            <span className="eyebrow">SOURCE / DATA LINEAGE</span>
            <button
              aria-label="Return to facility"
              className="icon-button"
              onClick={() => setFlip(false)}
            >
              <RotateCcw size={15} />
            </button>
          </div>
          <h3>A record you can inspect.</h3>
          <pre>
            {JSON.stringify(
              { ...facility, datasetVersion, delivery: dataSource },
              null,
              2,
            )}
          </pre>
          <a href={facility.coordinateSource} target="_blank" rel="noreferrer">
            Coordinate source
            <ArrowUpRight size={12} />
          </a>
          <a href={facility.sourceUrl} target="_blank" rel="noreferrer">
            Independent source
            <ArrowUpRight size={12} />
          </a>
        </div>
      </div>
    </section>
  );
}
