# VenomLink

**A map of the gap between a nearby hospital and accessible, suitable care.**

VenomLink explores snakebite-care geography in Lahore. Inspect independent facility records, compare sample-community access, and test how a Ravi crossing disruption or hypothetical local capability upgrade changes that access.

- [Application](https://shehar-e-yaar.github.io/venomlink/) — explicitly labeled demo until provider setup is completed.
- [Editable Figma design](https://www.figma.com/design/YW6WtWs7SMQb0aGdPstddh)
- [Architecture](ARCHITECTURE.md), [provider setup](SETUP.md), [submission draft](submission/SUBMISSION_WRITEUP.md), [2:45 demo script](submission/DEMO_VIDEO_SCRIPT.md).

## Current implementation status

Working without credentials: interactive geographic map, 11 attributed facility/reference records, eight approximate community anchors, map-origin selection, directory search, source-lineage flip cards, filters, sample-community coverage, bridge delay/closure and THQ upgrade scenarios, responsive layout, privacy/terms, and a local-only photo preview.

Implemented but **not deployed or verified against live providers**: AWS SDK v3 SearchNearby/SearchText via Lambda/API Gateway; independent datasets served from private S3; Google Maps TrafficLayer; protected Google computeRoutes/computeRouteMatrix via Secrets Manager; traffic interval rendering and bounded automatic refresh. The owner has not yet configured AWS or a billing-enabled Google project. The public demo does not pretend these are connected.

Optional deployment extensions: Glue/Iceberg ETL and Athena queries. No trained snake classifier is supplied; four illustrated examples are explicitly not inference. A [2:46 narrated screenshot walkthrough](https://shehar-e-yaar.github.io/venomlink/demo.html) demonstrates the actual application screens and discloses unconfigured providers. This is not yet a fully verified hackathon submission: the brief requires genuinely functioning AWS Places and S3 integrations. Replace the walkthrough with a live-provider recording after verification.

## Run and verify

Requires Node 22+ and Python 3.10+.

```sh
npm ci
npm run dev
npm test
npm run build
npm run backend:build
python pipeline/validate_facilities.py
python pipeline/etl_to_s3_iceberg.py
```

Open `http://127.0.0.1:5190`. Copy `.env.example` to `.env.local` only when configuring live services. Vite exposes every `VITE_*` value to browsers; only the restricted browser Maps key belongs there, never the Routes server key or AWS secrets.

## A reproducible demo

1. Start with Shahdara and inspect Mayo Hospital. The dashed path and ~26-minute value are illustrative planning estimates, not driving directions.
2. Flip the facility card to inspect coordinates, original source links, retrieval date, unknown clinical fields and dataset version.
3. Open Planner Simulator. At 20 minutes, baseline coverage is 4/8. A hypothetical Shahdara Town THQ eligibility upgrade changes this to 6/8. It does not claim that any real capability or stock exists.
4. Restore baseline, choose 30 minutes, then add the crossing delay: sampled coverage falls from 5/8 to 4/8. At 20 minutes the north-side anchors were already outside, so a delay changes their journey estimates without further reducing the coverage percentage.
5. Try crossing closure: crossing-dependent paths become unavailable, with no invented detour. Try Verified Only: no facilities meet independent clinical verification in this dataset.
6. Inspect AWS Discovery and Live Traffic. Without configuration they explicitly report unavailable; no synthetic provider responses are substituted.

## Data and modeling

The independent snapshot contains ten human-hospital candidates and one UVAS reference institution. Seven hospital locations derive from a saved OpenStreetMap hospital extract; three derive from published Punjab government coordinates. UVAS is approximate and excluded from human-care comparisons. Government Shahdara Teaching Hospital and Government Hospital Shahdara Town (THQ Level) are separate records.

Sources: [OpenStreetMap/ODbL](https://www.openstreetmap.org/copyright), [PITB coordinate document](https://pitb.gov.pk/system/files/DC-15.pdf), [Punjab Health hospital-name document](https://health.punjab.gov.pk/uploads/circular/10364Circular%20letter%20for%20chelum%20of%20hazrat%20imam%20hussain.pdf), [UVAS](https://www.uvas.edu.pk/). Source-document dates do not establish current operations. Retrieval timestamps are not clinical verification.

`pipeline/fetch_sources.py` retrieves the geographic extract; `build_facilities.py` reproduces the selected records; `validate_facilities.py` checks coordinates, sources and reference exclusions. Community anchors are hand-curated approximations with source links. No historical snake sightings are invented.

Planning uses geographic segments, a 1.35 detour multiplier, 20 km/h assumed speed, four minutes access overhead and one declared crossing anchor. Crossing delay is a hypothetical +20 minutes. Closure removes those connections. Upgrade changes only `shahdara-thq` eligibility. The six baseline eligible hospitals are an **illustrative scenario assumption**, not confirmed snakebite providers. Percentages represent unweighted sampled-community count, not population coverage. Highlight circles are not isochrones. See `src/services/accessibilityService.ts`.

## Provider boundaries

AWS Places discovery is a separate, attributed, ephemeral list. It is not a medical dataset, is never persisted in the independent S3/Iceberg dataset, and is not plotted on a third-party map. Matching a result to an independent record is provisional. Google route geometry is rendered only on Google Maps; the OSM fallback shows independent planning geometry only. Google traffic colors appear only for returned provider speed intervals. Matrix failures remain unavailable per destination.

The app debounces origin changes, cancels superseded requests, bounds the search area/radius/candidate count, and refreshes routes only while visible (default five minutes, minimum one minute). The public API template limits concurrency and request rate; CORS is not authentication. Review quotas and access controls for any wider deployment.

## Product limits

This is a planning and navigation-support prototype. No independently confirmed snakebite capability, antivenom stock, opening status, entrance location, dispatch integration or ambulance ETA is asserted. Confirm actual care directly. The photo helper makes no species, venom, harmlessness or treatment determination.

Code license: MIT. OSM-derived data retains ODbL attribution; government facts are attributed without asserting a broad license over the underlying documents.
