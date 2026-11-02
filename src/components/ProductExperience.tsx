import { SnakePhotoAssistant } from "./SnakePhotoAssistant";
import { useState, type ReactNode, type RefObject } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import {
  Github,
  ArrowDown,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Activity,
  Cloud,
  Database,
  Layers,
  MapPin,
  Menu,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  X,
} from "lucide-react";
import type { Facility, Origin } from "../types";
export type ProductModal =
  | "origin"
  | "traffic"
  | "photo"
  | "data"
  | "architecture"
  | "aws"
  | "privacy"
  | "terms"
  | "routes";
type Props = {
  origin: Origin;
  automaticRoute: string;
  comparisonScope: string;
  hasFastest: boolean;
  directionsHref: string;
  directionsName: string;
  onFastest: () => void;
  facilities: Facility[];
  selectedId: string | null;
  directoryQuery: string;
  onDirectoryQuery: (s: string) => void;
  onSelect: (f: Facility) => void;
  onOpen: (m: ProductModal) => void;
  onHome: () => void;
  onCompare: () => void;
  onTraffic: () => void;
  traffic: boolean;
  mapMode: string;
  northOnly: boolean;
  verifiedOnly: boolean;
  onNorth: () => void;
  onVerified: () => void;
  onAll: () => void;
  dataSource: string;
  dataError: string;
  awsStatus: string;
  mapSection: RefObject<HTMLElement>;
  map: ReactNode;
  popup: ReactNode;
};
const asset = (name: string) => `${import.meta.env.BASE_URL}images/${name}`;
function Brand() {
  return (
    <span className="product-brand">
      <svg viewBox="0 0 28 35" fill="none" aria-hidden="true">
        <path
          d="M20 5C6-2 1 12 12 17l5 2c12 6 4 17-9 11"
          stroke="currentColor"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
        <path
          d="m19 5 5 2-4 3"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
      <span>
        venom<span className="brand-light">link</span>
        <small>GEOGRAPHIC INTELLIGENCE</small>
      </span>
    </span>
  );
}
function Reveal({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
export function ProductExperience(p: Props) {
  const [menuOpen, setMenuOpen] = useState(false),
    [directoryOpen, setDirectoryOpen] = useState(false),
    [optionsOpen, setOptionsOpen] = useState(false);
  const reduced = useReducedMotion(),
    { scrollY } = useScroll(),
    snakeY = useTransform(scrollY, [0, 900], [0, 75]);
  const goMap = () => {
    setMenuOpen(false);
    p.mapSection.current?.scrollIntoView({
      behavior: reduced ? "auto" : "smooth",
      block: "start",
    });
  };
  return (
    <div className="product-site" id="top">
      <a href="#atlas" className="skip-link">
        Skip to the interactive map
      </a>
      <header className="product-header">
        <button
          className="brand-home"
          aria-label="VenomLink home"
          onClick={() => {
            p.onHome();
            window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
          }}
        >
          <Brand />
        </button>
        <nav
          className={menuOpen ? "product-nav is-open" : "product-nav"}
          aria-label="Main navigation"
        >
          <a href="#snake-id" onClick={() => setMenuOpen(false)}>
            Snake ID
          </a>
          <a href="#vision" onClick={() => setMenuOpen(false)}>
            The vision
          </a>
          <a href="#pipeline" onClick={() => setMenuOpen(false)}>
            Data journey
          </a>
          <a href="#atlas" onClick={() => setMenuOpen(false)}>
            The atlas
          </a>
        </nav>
        <a
          className="github-link"
          href="https://github.com/shehar-e-yaar"
          target="_blank"
          rel="noreferrer"
          aria-label="Visit my GitHub"
        >
          <Github size={22} />
        </a>
        <button
          className="mobile-menu"
          aria-label={menuOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </header>
      <main>
        <section className="product-hero" aria-labelledby="hero-title">
          <div className="hero-atmosphere" aria-hidden="true" />
          <motion.div
            className="hero-heading"
            initial={reduced ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <p className="product-eyebrow">
              <i />
              SNAKEBITE CARE. A NEW PERSPECTIVE.
            </p>
            <h1 id="hero-title">
              Clarity in
              <br />
              Every Coordinate.
            </h1>
          </motion.div>
          <div className="snake-stage">
            <div className="snake-orbit" aria-hidden="true" />
            <motion.div
              className="hero-snake"
              style={reduced ? undefined : { y: snakeY }}
              initial={reduced ? false : { opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.25, delay: 0.15 }}
            >
              <img
                src={asset("glass-snake-hero.webp")}
                width="1536"
                height="1024"
                alt="A translucent ice-blue glass snake sculpture with intricate crystal scales"
                fetchPriority="high"
              />
            </motion.div>
            <div className="hero-context">
              <p className="product-eyebrow">LAHORE, PAKISTAN</p>
              <p>Snakebite care, mapped.</p>
              <button className="primary-button" onClick={goMap}>
                Enter the atlas
                <ArrowUpRight size={14} />
              </button>
            </div>
            <div className="hero-coordinate">
              <span className="coordinate-cross">+</span>
              <div>
                <span>ORIGIN / {p.origin.name}</span>
                <strong>
                  {p.origin.lat.toFixed(4)}° N &nbsp; {p.origin.lng.toFixed(4)}°
                  E
                </strong>
              </div>
            </div>
            <button
              className="glass-panel hero-discovery"
              onClick={() => p.onOpen("aws")}
            >
              <span className="panel-overline">
                CONNECTED GEOGRAPHY
                <Cloud size={15} />
              </span>
              <strong>Discover with context.</strong>
              <span>
                Powered by Amazon Location
                <ArrowUpRight size={12} />
              </span>
            </button>
          </div>
          <div className="hero-bottom">
            <span>CONCEPT VISUAL / GLASS SERPENT</span>
            <a href="#vision">
              A different way to see
              <ArrowDown size={15} />
            </a>
            <span>CURRENT MAP LAYER / CARE LOCATIONS</span>
          </div>
        </section>
        <section className="technology-strip" aria-label="Technologies used">
          <p>
            Built with tools
            <br /> that connect the world.
          </p>
          <div>
            <span className="tech-aws">
              amazon<span>web services</span>
            </span>
            <span className="tech-google">
              Google <span>Maps</span>
            </span>
            <span className="tech-osm">
              <MapPin size={22} />
              OpenStreetMap
            </span>
          </div>
          <button
            className="quiet-link"
            onClick={() => p.onOpen("architecture")}
          >
            How it connects
            <ArrowUpRight size={13} />
          </button>
        </section>
        <section
          className="snake-id-section"
          id="snake-id"
          aria-labelledby="snake-id-title"
        >
          <Reveal className="snake-id-copy">
            <p className="product-eyebrow">YOUR SNAKE CLASSIFIER</p>
            <h2 id="snake-id-title">
              A photo.
              <br />A closer look.
            </h2>
            <p>Explore a possible species, then find care.</p>
            <span className="model-badge">
              498 species / runs on your device
            </span>
          </Reveal>
          <div className="snake-id-tool glass-panel">
            <SnakePhotoAssistant />
          </div>
        </section>
        <section className="vision-section" id="vision">
          <Reveal className="vision-copy">
            <p className="product-eyebrow">BEYOND A PIN ON A MAP</p>
            <h2>
              Every point.
              <br />A clearer picture.
            </h2>
            <p className="section-copy">
              Care locations. Road context. Clear sources.
            </p>
          </Reveal>
          <div className="vision-visual">
            <img
              src={asset("glass-snake-hero.webp")}
              alt="A complete translucent glass snake sculpture"
              width="1536"
              height="1024"
              loading="lazy"
            />
            <motion.button
              className="glass-panel vision-panel evidence-panel"
              onClick={() => p.onOpen("data")}
              initial={reduced ? false : { opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.65, duration: 0.7 }}
            >
              <span className="panel-overline">
                A POINT WITH A PURPOSE
                <ArrowUpRight size={13} />
              </span>
              <svg
                className="coordinate-art"
                viewBox="0 0 180 54"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M0 37Q30 4 62 28T124 21T180 29M0 43Q37 13 70 34T139 27T180 34"
                  stroke="currentColor"
                  strokeWidth=".8"
                />
                <path
                  d="M0 47Q35 28 67 41T133 36T180 41"
                  stroke="currentColor"
                  strokeWidth=".5"
                />
                <circle cx="87" cy="30" r="4" fill="#ee650b" />
                <circle cx="87" cy="30" r="10" stroke="#ee650b" opacity=".3" />
              </svg>
              <strong>Evidence in every point.</strong>
              <span>
                Explore the source
                <ArrowRight size={12} />
              </span>
            </motion.button>
          </div>
        </section>
        <section className="pipeline-section" id="pipeline">
          <Reveal className="section-heading">
            <p className="product-eyebrow">THE DATA JOURNEY</p>
            <h2>
              From source.
              <br className="mobile-break" /> To perspective.
            </h2>
            <p>Trace. Check. Explore.</p>
          </Reveal>
          <div className="pipeline-track connected-timeline">
            <div className="timeline-rail" aria-hidden="true">
              <span />
            </div>
            {[
              {
                number: "01",
                Icon: Database,
                title: "Source",
                text: "Public records. Linked coordinates.",
              },
              {
                number: "02",
                Icon: ShieldCheck,
                title: "Validate",
                text: "Checked with Python. Delivered by S3.",
              },
              {
                number: "03",
                Icon: MapPin,
                title: "Explore",
                text: "AWS discovery. Google road context.",
              },
            ].map(({ number, Icon, title, text }) => (
              <Reveal key={number} className="pipeline-step">
                <div className="timeline-node">
                  <span>{number.replace("0", "")}</span>
                </div>
                <h3>{title}</h3>
                <p>{text}</p>
              </Reveal>
            ))}
          </div>
          <p className="dataset-caption">
            Current dataset: independent care locations in Lahore.
            Snake-sighting records are a future layer.
          </p>
        </section>
        <section
          className="atlas-section"
          id="atlas"
          ref={p.mapSection}
          aria-labelledby="atlas-title"
        >
          <Reveal className="section-heading">
            <p className="product-eyebrow">THE INTERACTIVE ATLAS</p>
            <h2 id="atlas-title">Venomap</h2>
            <p>Explore snakebite care and antivenom leads on the map.</p>
          </Reveal>
          <div className="atlas-toolbar">
            <button
              className="origin-control"
              onClick={() => p.onOpen("origin")}
            >
              <span className="origin-control-icon">
                <MapPin size={17} />
              </span>
              <span>
                <small>YOUR STARTING POINT</small>
                <strong>{p.origin.name}</strong>
              </span>
              <ArrowUpRight size={14} />
            </button>
            <div className="atlas-tools">
              <button
                className={p.traffic ? "tool-button active" : "tool-button"}
                onClick={p.onTraffic}
                aria-pressed={p.traffic}
              >
                <Activity size={16} />
                <span>Traffic</span>
              </button>
              <button
                className={directoryOpen ? "tool-button active" : "tool-button"}
                onClick={() => {
                  setDirectoryOpen((v) => !v);
                  setOptionsOpen(false);
                }}
                aria-expanded={directoryOpen}
              >
                <Search size={16} />
                <span>Locations</span>
              </button>
              <div className="options-anchor">
                <button
                  className={optionsOpen ? "tool-button active" : "tool-button"}
                  aria-label="Map options"
                  aria-expanded={optionsOpen}
                  onClick={() => setOptionsOpen((v) => !v)}
                >
                  <SlidersHorizontal size={16} />
                </button>
                {optionsOpen && (
                  <div className="map-options glass-panel">
                    <strong>Focus the map</strong>
                    <button
                      aria-pressed={!p.northOnly && !p.verifiedOnly}
                      onClick={p.onAll}
                    >
                      All locations
                    </button>
                    <button aria-pressed={p.northOnly} onClick={p.onNorth}>
                      North of Ravi
                    </button>
                    <button
                      aria-pressed={p.verifiedOnly}
                      onClick={p.onVerified}
                    >
                      Verified capability only
                    </button>
                    <button
                      onClick={() => {
                        setOptionsOpen(false);
                        p.onOpen("traffic");
                      }}
                    >
                      Road context & details
                    </button>
                    <button
                      onClick={() => setOptionsOpen(false)}
                      className="options-done"
                    >
                      Done
                      <ArrowRight size={13} />
                    </button>
                  </div>
                )}
              </div>
              <button
                className="primary-button compare-trigger"
                aria-label="Compare hospital routes"
                onClick={p.onCompare}
              >
                Compare routes
                <ArrowUpRight size={14} />
              </button>
            </div>
          </div>
          <div
            className="automatic-route glass-panel"
            role="status"
            aria-live="polite"
          >
            <div>
              <strong>{p.automaticRoute}</strong>
              <p>{p.comparisonScope}</p>
            </div>
            {p.hasFastest && (
              <button className="quiet-link" onClick={p.onFastest}>
                Show route <ArrowUpRight size={15} />
              </button>
            )}
          </div>
          {!p.hasFastest && p.directionsHref && (
            <a
              className="maps-directions-link quiet-link"
              href={p.directionsHref}
              target="_blank"
              rel="noreferrer"
            >
              Open directions to {p.directionsName} in Google Maps{" "}
              <ArrowUpRight size={14} />
            </a>
          )}
          <p className="hospital-legend">
            <b>A?</b> User-listed antivenom lead <span>Stock unconfirmed</span>{" "}
            <b>H</b> Other hospital <b>R</b> Reference
          </p>
          {p.dataError && (
            <p className="atlas-status-note" role="status">
              {p.dataError}
            </p>
          )}
          <div
            className={`atlas-frame ${directoryOpen ? "directory-open" : ""}`}
          >
            <div className="map-stage product-map">
              {p.map}
              {p.popup}
              {directoryOpen && (
                <aside
                  className="location-drawer glass-panel"
                  aria-label="Location directory"
                >
                  <div className="location-drawer-heading">
                    <h3>Explore locations</h3>
                    <button
                      className="icon-button"
                      aria-label="Close location directory"
                      onClick={() => setDirectoryOpen(false)}
                    >
                      <X size={17} />
                    </button>
                  </div>
                  <label className="location-search">
                    <Search size={15} />
                    <input
                      aria-label="Search facility directory"
                      value={p.directoryQuery}
                      onChange={(e) => p.onDirectoryQuery(e.target.value)}
                      placeholder="Find a care location…"
                    />
                  </label>
                  <div className="location-results">
                    {p.facilities.map((f) => (
                      <button
                        key={f.id}
                        className={
                          p.selectedId === f.id
                            ? "location-result selected"
                            : "location-result"
                        }
                        onClick={() => {
                          p.onSelect(f);
                          setDirectoryOpen(false);
                        }}
                      >
                        <MapPin size={15} />
                        <span>
                          <strong>{f.name}</strong>
                          <small>
                            {f.neighborhood} ·{" "}
                            {f.kind === "reference"
                              ? "Reference only"
                              : "Capability unconfirmed"}
                          </small>
                        </span>
                        <ArrowUpRight size={12} />
                      </button>
                    ))}
                    {!p.facilities.length && (
                      <p className="directory-empty">
                        No matching locations. Adjust your search or map
                        filters. Clinical snakebite capability remains
                        unconfirmed in this dataset.
                      </p>
                    )}
                  </div>
                </aside>
              )}
            </div>
            <div className="atlas-bottom">
              <span>
                <i
                  className={
                    p.dataSource.startsWith("Amazon S3")
                      ? "connection-dot connected"
                      : "connection-dot"
                  }
                />
                {p.dataSource.startsWith("Amazon S3")
                  ? "Independent records · delivered by Amazon S3"
                  : "Independent facility records · Lahore"}
              </span>
              <div>
                <button onClick={() => p.onOpen("aws")}>
                  <Cloud size={14} />
                  AWS discovery
                  <ArrowUpRight size={12} />
                </button>
                <button onClick={() => p.onOpen("data")}>
                  Sources
                  <ArrowUpRight size={12} />
                </button>
              </div>
            </div>
          </div>
        </section>
        <section className="closing-section">
          <img
            src={asset("glass-snake-hero.webp")}
            alt=""
            aria-hidden="true"
            loading="lazy"
          />
          <Reveal className="closing-copy">
            <p className="product-eyebrow">A NEW PERSPECTIVE STARTS HERE</p>
            <h2>
              Find your
              <br />
              perspective.
            </h2>
            <button className="primary-button" onClick={goMap}>
              Explore VenomLink
              <ArrowUpRight size={15} />
            </button>
            <button className="quiet-link" onClick={() => p.onOpen("data")}>
              Understand the data
              <ArrowRight size={13} />
            </button>
          </Reveal>
        </section>
      </main>
      <footer className="product-footer">
        <div className="footer-top">
          <div>
            <Brand />
            <p>
              Snakebite care geography,
              <br />
              seen from a different perspective.
            </p>
          </div>
          <div className="footer-links">
            <div>
              <span>EXPLORE</span>
              <a href="#atlas">The atlas</a>
              <a href="#pipeline">Data journey</a>
              <button onClick={() => p.onOpen("photo")}>Photo helper</button>
            </div>
            <div>
              <span>UNDERSTAND</span>
              <button onClick={() => p.onOpen("data")}>Data & sources</button>
              <button onClick={() => p.onOpen("architecture")}>
                AWS architecture
              </button>
              <a
                href="https://github.com/shehar-e-yaar/venomlink"
                target="_blank"
                rel="noreferrer"
              >
                Source code ↗
              </a>
            </div>
            <div>
              <span>THE DETAILS</span>
              <button onClick={() => p.onOpen("privacy")}>Privacy</button>
              <button onClick={() => p.onOpen("terms")}>Responsible use</button>
              <a href={`${import.meta.env.BASE_URL}demo.html`}>
                Functional walkthrough ↗
              </a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <span>
            © {new Date().getFullYear()} VenomLink · Muhammad Sheheryar
          </span>
          <span>Evaluation prototype. Quota-limited map access.</span>
          <a href="#top">
            Back to the surface
            <ArrowUpRight size={12} />
          </a>
        </div>
      </footer>
    </div>
  );
}
