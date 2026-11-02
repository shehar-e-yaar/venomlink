import { RefreshCw, ArrowUpRight } from "lucide-react";
import type { Facility, MatrixItem } from "../types";
export function RouteComparison({
  facilities,
  items,
  status,
  error,
  refreshedAt,
  onRefresh,
  onSelect,
}: {
  facilities: Facility[];
  items: MatrixItem[];
  status: string;
  error: string;
  refreshedAt: string | null;
  onRefresh: () => void;
  onSelect: (f: Facility) => void;
}) {
  return (
    <div className="route-comparison">
      <p className="intro-text">
        Driving estimates for nearby candidates. Treatment capability still
        needs direct confirmation.
      </p>
      <div className="comparison-actions">
        <span className="route-status">
          {status === "loading"
            ? "Requesting Google driving estimates…"
            : status === "connected"
              ? `Google Maps · ${refreshedAt ? new Date(refreshedAt).toLocaleTimeString() : ""}`
              : error || "Request a comparison when needed."}
        </span>
        <button
          className="outline-button"
          onClick={onRefresh}
          disabled={status === "loading"}
        >
          <RefreshCw size={14} className={status === "loading" ? "spin" : ""} />
          Refresh comparison
        </button>
      </div>
      <div className="comparison-table">
        <table>
          <thead>
            <tr>
              <th>Care location</th>
              <th>Driving time</th>
              <th>Distance</th>
            </tr>
          </thead>
          <tbody>
            {[...facilities]
              .sort(
                (a, b) =>
                  (items.find((m) => m.facilityId === a.id)?.durationSec ??
                    Infinity) -
                  (items.find((m) => m.facilityId === b.id)?.durationSec ??
                    Infinity),
              )
              .map((f) => {
                const item = items.find((m) => m.facilityId === f.id);
                return (
                  <tr key={f.id}>
                    <td>
                      <button onClick={() => onSelect(f)}>
                        {f.name}
                        <ArrowUpRight size={12} />
                      </button>
                      <small>Capability unconfirmed</small>
                    </td>
                    <td>
                      {item?.durationSec != null
                        ? `${Math.round(item.durationSec / 60)} min`
                        : "Unavailable"}
                    </td>
                    <td>
                      {item?.distanceMeters != null
                        ? `${(item.distanceMeters / 1000).toFixed(1)} km`
                        : "—"}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
      <p className="fine-print">
        Candidates are chosen by geographic proximity, then sorted by returned
        driving time. Estimates are not ambulance response times.
      </p>
    </div>
  );
}
