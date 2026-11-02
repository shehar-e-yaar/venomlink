import type { Coverage, Scenario } from "../types";
import { ArrowUpRight, Info } from "lucide-react";
export function CoverageGauge({
  coverage,
  scenario,
  onExplain,
}: {
  coverage: Coverage;
  scenario: Scenario;
  onExplain: () => void;
}) {
  const p = coverage.current;
  return (
    <section className="coverage-card card">
      <div className="card-heading">
        <h2>Care-Access Status</h2>
        <button
          className="icon-button"
          aria-label="Explain accessibility model"
          onClick={onExplain}
        >
          <Info size={17} />
        </button>
      </div>
      <p className="eyebrow">ESTIMATED {scenario.threshold}-MINUTE ACCESS</p>
      <div className="gauge">
        <svg
          viewBox="0 0 320 172"
          role="img"
          aria-label={`${Math.round(p)} percent of sampled communities within the illustrative threshold`}
        >
          <path
            className="gauge-track"
            d="M35 143 A125 125 0 0 1 285 143"
            pathLength="100"
          />
          <path
            className="gauge-value"
            d="M35 143 A125 125 0 0 1 285 143"
            pathLength="100"
            strokeDasharray={`${p} 100`}
          />
        </svg>
        <div className="gauge-number">
          <strong>
            {Math.round(p)}
            <small>%</small>
          </strong>
          <span>
            {coverage.covered} of {coverage.count} communities
          </span>
        </div>
        <span className="gauge-min">0%</span>
        <span className="gauge-max">100%</span>
      </div>
      <div className="coverage-baseline">
        <span>Baseline {Math.round(coverage.baseline)}%</span>
        <strong>
          {p - coverage.baseline > 0 ? "+" : ""}
          {Math.round(p - coverage.baseline)} pts
          <ArrowUpRight size={12} />
        </strong>
      </div>
      <p className="model-badge">Illustrative model · not clinical coverage</p>
    </section>
  );
}
