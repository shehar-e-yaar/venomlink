# VenomLink

**Explore the gap between a hospital nearby and accessible, suitable care.**

VenomLink is a hackathon prototype for Lahore: inspect independent public facility records, request Google driving estimates, and test how a Ravi crossing disruption or hypothetical local capability upgrade changes modeled geographic access.

- [Open the prototype](https://shehar-e-yaar.github.io/venomlink/)
- [Watch the narrated walkthrough](https://shehar-e-yaar.github.io/venomlink/demo.html)
- [Editable Figma design](https://www.figma.com/design/YW6WtWs7SMQb0aGdPstddh)
- [Architecture](ARCHITECTURE.md), [setup](SETUP.md), [submission write-up](submission/SUBMISSION_WRITEUP.md)

## Verified implementation

The deployed backend in Sydney uses API Gateway and Lambda, Amazon Location SearchNearby/SearchText, private encrypted/versioned S3, and Secrets Manager for the backend route credential. The browser displays independently sourced coordinates on Google Maps using a **no-billing Maps Demo Key**. The selected route uses real Compute Routes responses, traffic-aware driving duration, distance, encoded geometry and provider speed intervals when returned. All 11 independent records have been retrieved through the deployed S3 API.

The Maps Demo Key supports Compute Routes but the separate computeRouteMatrix method rejected the key with BILLING_DISABLED. Demo mode therefore compares up to five independent candidates through supported Compute Routes calls **only when requested**. Missing routes remain unavailable per candidate. No paid Google billing was enabled. Google demo quotas can pause service, and the key is strictly for evaluation/prototyping, not production. [Google demo-key guide](https://developers.google.com/maps/documentation/javascript/demo-key).

AWS hospital-category searches around the sample origin returned zero matches in the live checks. SearchText returned the actual Shahdara locality. The UI preserves this provider coverage gap: zero results do not establish that hospitals are absent, and a locality is not a treatment facility. AWS results stay in an attributed session-only discovery list, separate from the independent map dataset.

Working interactions include origin selection, directory search, source-lineage flip cards, verification/geographic filters, live route inspection, on-demand comparisons, community access modeling, bridge delay/closure, a THQ planning upgrade, responsive layout, and local-only photo preview. Four photo-helper illustrations are labeled examples; **no trained classifier is connected**. Iceberg/Athena scripts are provided but have not been deployed or verified live.

## Run and verify

Use Node 22+ and Python 3.10+:

```sh
npm ci
npm run dev
npm test
npm run build
npm run backend:build
python pipeline/validate_facilities.py
```

Open `http://127.0.0.1:5190`. Copy `.env.example` to `.env.local` and fill only your browser credential and backend URL. `VITE_*` values are browser-visible. Never commit AWS credentials or a private server credential. Set `VITE_GOOGLE_MAPS_DEMO_MODE=true` for the no-billing prototype path. Missing/failed map credentials fall back to an attributed OSM map, with independent illustrative geometry only; Google route geometry is never rendered on that fallback.

On Windows, `. .\pipeline\use-cloud-tools.ps1` refreshes installed CLI paths and selects an isolated Node 22 runtime when available. Python data dependencies belong in `.venv`. Deployment instructions include an active AWS Free-plan/credit guard and never upgrade the account or activate Google billing.

## Explore the scenario

1. Select Shahdara and Mayo Hospital; distinguish the live driving estimate from the separate illustrative model. Flip the card to inspect its real source record and S3 delivery metadata.
2. Open Planner Simulator: at twenty minutes the baseline covers **4/8** sample communities. A hypothetical Shahdara Town THQ eligibility upgrade changes this to **6/8**. No real treatment upgrade or antivenom stock is asserted.
3. Restore baseline and choose thirty minutes. A hypothetical crossing delay changes modeled coverage from **5/8 to 4/8**. Only crossing-dependent model journeys receive the delay. A closure removes those connections without inventing a detour. These scenarios do not modify Google's reported road conditions.
4. Try Verified Only: no clinical snakebite capabilities have been independently confirmed. Request a driving comparison only as geographic information, then confirm actual care directly.
5. Inspect AWS Discovery; try SearchText for Shahdara. It returns a geographic reference, not medical suitability.

## Independent data and assumptions

The snapshot contains ten human-hospital candidates and one UVAS reference institution, plus eight approximate community anchors. Seven hospital coordinates derive from the saved OSM extract; three from published Punjab government coordinates. Government Shahdara Teaching Hospital and Government Hospital Shahdara Town (THQ Level) are distinct records. UVAS is approximate and excluded from human-care comparisons.

Sources: [OpenStreetMap/ODbL](https://www.openstreetmap.org/copyright), [PITB coordinates](https://pitb.gov.pk/system/files/DC-15.pdf), [Punjab Health facility names](https://health.punjab.gov.pk/uploads/circular/10364Circular%20letter%20for%20chelum%20of%20hazrat%20imam%20hussain.pdf), [UVAS](https://www.uvas.edu.pk/). Source dates do not establish current operations; retrieval dates are not clinical verification. Reproduce the dataset with `pipeline/fetch_sources.py`, `build_facilities.py`, and `validate_facilities.py`. No historical snake sightings are invented.

Planning uses geographic segments, 1.35 detour multiplier, 20 km/h assumed speed, four minutes access overhead, and one declared crossing anchor. Six baseline hospitals are eligible only by an illustrative scenario assumption. The gauge counts unweighted sample origins, not people or population coverage. Highlight circles are not isochrones. All treatment-capability and antivenom-stock fields remain unknown.

## Limits and rights

This is a planning/navigation-support prototype, not ambulance dispatch or a clinically validated triage service. Driving durations are not ambulance response times. Coordinate centers are not surveyed entrances. No diagnosis, species identification, harmlessness or antivenom-treatment determination is made.

Code: MIT. OSM-derived data retains ODbL attribution. Government facts are attributed without claiming a broad license over their source documents. Provider discovery/route content is not persisted in S3 or optional Iceberg data. Google content appears only with Google Maps and its attribution.
