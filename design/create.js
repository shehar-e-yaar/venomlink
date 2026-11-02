await Promise.all(
  ["Regular", "Medium", "Semi Bold", "Bold"].map((style) =>
    figma.loadFontAsync({ family: "Inter", style }),
  ),
);
const ids = [],
  track = (n) => (ids.push(n.id), n),
  rgb = (h) => ({
    r: parseInt(h.slice(1, 3), 16) / 255,
    g: parseInt(h.slice(3, 5), 16) / 255,
    b: parseInt(h.slice(5, 7), 16) / 255,
  });
const colors = {
  canvas: "#F7F6F2",
  white: "#FFFFFF",
  ink: "#1C1D1F",
  muted: "#747A80",
  amber: "#F5C451",
  butter: "#FDF6D8",
  line: "#EFECE6",
  sage: "#DCE8D4",
  water: "#C9DCD9",
};
const coll = figma.variables.createVariableCollection("VenomLink / Warm bento"),
  vars = {};
for (const [k, h] of Object.entries(colors)) {
  const v = figma.variables.createVariable(k, coll, "COLOR");
  v.scopes = ["FRAME_FILL", "SHAPE_FILL", "TEXT_FILL", "STROKE_COLOR"];
  v.setValueForMode(coll.defaultModeId, rgb(h));
  vars[k] = v;
}
const paint = (k) =>
  figma.variables.setBoundVariableForPaint(
    { type: "SOLID", color: rgb(colors[k]) },
    "color",
    vars[k],
  );
const buttons = await figma.importComponentSetByKeyAsync(
  "cc8b558dc7d9684011b6b99ce8e6509399bc836b",
);
function txt(p, s, size = 14, color = "ink", style = "Regular", w) {
  const t = track(figma.createText());
  t.fontName = { family: "Inter", style };
  t.fontSize = size;
  t.characters = s;
  t.fills = [paint(color)];
  if (w) {
    t.textAutoResize = "HEIGHT";
    t.resize(w, t.height);
  }
  p.appendChild(t);
  return t;
}
function card(p, name, x, y, w, h, color = "white") {
  const n = track(figma.createAutoLayout("VERTICAL"));
  n.name = name;
  n.resize(w, h);
  n.primaryAxisSizingMode = "FIXED";
  n.counterAxisSizingMode = "FIXED";
  n.paddingLeft = n.paddingRight = n.paddingTop = n.paddingBottom = 24;
  n.itemSpacing = 14;
  n.cornerRadius = 30;
  n.fills = [paint(color)];
  p.appendChild(n);
  n.x = x;
  n.y = y;
  return n;
}
function pill(p, s) {
  const i = track(buttons.defaultVariant.createInstance());
  i.setProperties({
    "Label#2:0": s,
    "Has Icon Start#4:128": false,
    "Has Icon End#4:64": false,
  });
  i.cornerRadius = 28;
  p.appendChild(i);
  return i;
}
let startX = 100;
for (const n of figma.currentPage.children)
  startX = Math.max(startX, n.x + n.width + 100);
function root(name, w, h, x) {
  const n = track(figma.createFrame());
  n.name = name;
  n.resize(w, h);
  n.fills = [paint("canvas")];
  n.x = x;
  n.y = 200;
  return n;
}
const d = root("Desktop / Care Finder", 1440, 1160, startX);
const brand = card(d, "Brand", 40, 24, 400, 65, "canvas");
brand.layoutMode = "HORIZONTAL";
brand.paddingLeft = 0;
txt(brand, "◈ VENOMLINK", 23, "ink", "Bold");
txt(brand, "LAHORE / PK", 9, "muted");
const nav = card(d, "Floating navigation", 510, 27, 890, 55);
nav.layoutMode = "HORIZONTAL";
nav.paddingTop = 8;
nav.paddingLeft = 10;
nav.itemSpacing = 22;
pill(nav, "Care Finder");
for (const s of [
  "Live Traffic",
  "Planner Simulator",
  "Photo Assistant",
  "Data & AWS",
])
  txt(nav, s, 11, "muted");
const title = card(d, "Editorial heading", 40, 102, 1000, 90, "canvas");
title.paddingLeft = title.paddingTop = 0;
txt(title, "Snakebite Care & Access Atlas", 34, "ink", "Medium");
txt(
  title,
  "Explore how geography shapes access to emergency healthcare.",
  14,
  "muted",
);
const filters = card(d, "Secondary filters", 40, 195, 1100, 46, "canvas");
filters.layoutMode = "HORIZONTAL";
filters.paddingLeft = filters.paddingTop = 0;
for (const s of [
  "All Lahore",
  "North of Ravi",
  "Bridge Scenario",
  "Verified Only",
  "Traffic Overlay",
])
  pill(filters, s);
for (const [i, name, title, sub, label] of [
  [
    0,
    "Origin summary",
    "Shahdara & North Ravi",
    "Select your origin · Explore nearby care",
    "Choose community ↗",
  ],
  [
    1,
    "Traffic summary",
    "Road Access Intelligence",
    "Traffic when connected. Clear scenarios always.",
    "Open planner ↗",
  ],
  [
    2,
    "Photo summary",
    "AI Species Helper",
    "A photo should never delay finding care.",
    "Explore illustrative samples ↗",
  ],
]) {
  const c = card(
    d,
    name,
    40 + i * 460,
    266,
    440,
    182,
    i === 1 ? "butter" : "white",
  );
  txt(
    c,
    [
      "01 / YOUR STARTING POINT",
      "02 / THE WAY THERE",
      "03 / OPTIONAL ASSISTANCE",
    ][i],
    10,
    "muted",
    "Medium",
  );
  txt(c, title, 22, "ink", "Medium");
  txt(c, sub, 12, "muted");
  pill(c, label);
}
const map = card(
  d,
  "Map Session / independent geographic content",
  40,
  468,
  920,
  632,
);
txt(map, "Map Session", 22, "ink", "Medium");
txt(map, "LAHORE CARE ACCESS & ROUTING", 10, "muted", "Medium");
const mapSvg =
  '<svg width="868" height="470" viewBox="0 0 868 470" xmlns="http://www.w3.org/2000/svg"><rect width="868" height="470" fill="#F2F1E9"/><g fill="none" stroke="#FFFFFF" stroke-width="7"><path d="M0 120L868 380M0 260L868 100M0 380L868 290M120 0L440 470M320 0L640 470M560 0L860 470"/></g><g fill="none" stroke="#DEDCD1" stroke-width="1"><path d="M0 80L868 340M0 160L868 420M0 220L868 60M0 300L868 140M50 0L370 470M190 0L510 470M430 0L750 470"/></g><path d="M0 60Q300 160 270 280T500 470" fill="none" stroke="#C9DCD9" stroke-width="34"/><path d="M320 95L370 190L490 290L560 340" stroke="#F5C451" stroke-width="6" stroke-linecap="round" fill="none"/><circle cx="320" cy="95" r="12" fill="#1C1D1F" stroke="white" stroke-width="5"/><circle cx="560" cy="340" r="13" fill="#F5C451" stroke="white" stroke-width="5"/></svg>';
const svg = track(figma.createNodeFromSvg(mapSvg));
map.appendChild(svg);
txt(
  map,
  "Independent locations · Illustrative planning paths · Not navigation",
  10,
  "muted",
);
const pop = card(d, "Facility popup / front", 615, 660, 295, 250);
txt(pop, "CANDIDATE FACILITY", 9, "muted", "Medium");
txt(pop, "Mayo Hospital", 22, "ink", "Medium");
txt(pop, "Walled City · Source-linked location", 11, "muted");
txt(pop, "Treatment suitability unknown", 12, "ink", "Medium");
txt(pop, "Antivenom: requires direct confirmation", 10, "muted");
pill(pop, "View data lineage ↻");
const gauge = card(d, "Care-access gauge", 980, 468, 420, 275);
txt(gauge, "Care-Access Status", 20, "ink", "Medium");
txt(gauge, "ESTIMATED 20-MINUTE ACCESS", 10, "muted");
const gaugeSvg =
  '<svg width="340" height="125" viewBox="0 0 340 125" xmlns="http://www.w3.org/2000/svg"><path d="M40 115A130 100 0 0 1 300 115" fill="none" stroke="#EFECE6" stroke-width="24" stroke-linecap="round"/><path d="M40 115A130 100 0 0 1 240 32" fill="none" stroke="#F5C451" stroke-width="24" stroke-linecap="round"/></svg>';
const g = track(figma.createNodeFromSvg(gaugeSvg));
gauge.appendChild(g);
txt(gauge, "Computed from sampled communities", 11, "muted");
txt(gauge, "ILLUSTRATIVE MODEL · NOT CLINICAL COVERAGE", 9, "muted");
const dir = card(d, "Dark facility directory", 980, 763, 420, 337, "ink");
txt(dir, "Facilities & Geographic Access", 18, "white", "Medium");
txt(dir, "Locations are sourced. Capabilities need confirmation.", 10, "line");
for (const s of [
  "Mayo Hospital",
  "Shahdara Teaching Hospital",
  "Services Hospital",
  "Sir Ganga Ram Hospital",
])
  txt(dir, "✚   " + s, 14, "white");
txt(dir, "Explore all facilities ↗", 12, "amber");
const m = root("Mobile / Care Finder", 390, 1480, d.x + 1600);
const mh = card(m, "Mobile header", 16, 20, 358, 60, "canvas");
mh.paddingLeft = 0;
txt(mh, "◈ VENOMLINK", 22, "ink", "Bold");
const mt = card(m, "Mobile title", 16, 92, 358, 126, "canvas");
mt.paddingLeft = mt.paddingTop = 0;
txt(mt, "Care is a journey.\nUnderstand the way.", 30, "ink", "Medium");
txt(mt, "Lahore care & access atlas", 12, "muted");
const ms = card(m, "Mobile origin", 16, 222, 358, 145);
txt(ms, "YOUR STARTING POINT", 9, "muted");
txt(ms, "Shahdara & North Ravi", 21, "ink", "Medium");
pill(ms, "Choose community ↗");
const mm = card(m, "Mobile map", 16, 383, 358, 430);
txt(mm, "Map Session", 20, "ink", "Medium");
const mv = track(figma.createNodeFromSvg(mapSvg));
mm.appendChild(mv);
mv.resize(306, 278);
txt(mm, "Demo map · Independent OSM data", 9, "muted");
const mg = card(m, "Mobile gauge", 16, 829, 358, 230);
txt(mg, "Care-Access Status", 20, "ink", "Medium");
const gv = track(figma.createNodeFromSvg(gaugeSvg));
mg.appendChild(gv);
gv.resize(290, 105);
txt(mg, "20-minute threshold · Illustrative model", 11, "muted");
const md = card(m, "Mobile directory", 16, 1075, 358, 360, "ink");
txt(md, "Facilities near your origin", 20, "white", "Medium");
for (const s of [
  "Mayo Hospital",
  "Shahdara Teaching Hospital",
  "Services Hospital",
  "Sir Ganga Ram Hospital",
])
  txt(md, s, 14, "white");
pill(md, "Open infrastructure planner");
const state = card(
  figma.currentPage,
  "Interaction states / specifications",
  d.x + 2150,
  200,
  500,
  720,
);
txt(state, "Interaction states", 26, "ink", "Medium");
for (const s of [
  "AWS searching → loading indicator + cancellable request",
  "AWS results → attributed list; capability unknown",
  "Route loading → no invented ETA",
  "Route error → retry + degraded status",
  "Bridge disruption → +20 min on crossing paths only",
  "Upgrade → hypothetical eligibility, unchanged speeds",
  "Photo → illustrative samples if no trained model",
  "Lineage → actual source JSON + S3 status",
])
  txt(state, s, 13, "muted", "Regular", 440);
return {
  createdNodeIds: ids,
  desktop: d.id,
  mobile: m.id,
  states: state.id,
  fonts: ["Inter"],
  counts: {
    desktop: d.findAll(() => true).length,
    mobile: m.findAll(() => true).length,
  },
};
