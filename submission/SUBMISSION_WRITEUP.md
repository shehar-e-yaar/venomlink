# VenomLink — Snakebite Care & Healthcare Accessibility Atlas

**Draft: complete live provider verification before submitting.**

## The problem

A hospital can be nearby on a map while appropriate care remains difficult to reach. In Lahore, a journey across the Ravi and uncertain facility capabilities make distance alone an inadequate planning measure. VenomLink makes that distinction visible: where are facilities, what evidence supports those records, and how sensitive is modeled geographic access to a crossing disruption or a local capability improvement?

## What we built

A responsive interactive atlas with independent hospital records, inspectable data lineage, sample-community access modeling, origin selection, facility comparisons and transparent infrastructure scenarios. The visual centerpiece is a map paired with a live recalculating semicircular access gauge. Users can test a hypothetical crossing delay, remove crossing-dependent connections, or change Shahdara Town THQ's planning eligibility.

The map does not pretend that unknown care is verified. All treatment-capability and antivenom-stock fields remain unknown. UVAS is reference-only. A photo helper illustrates an optional future workflow without inventing AI predictions.

## Dataset

Eleven independent records: ten human-hospital candidates and one UVAS reference point. Sources combine a saved OpenStreetMap extract, public Punjab government facility coordinates and hospital-name documents, with an approximate UVAS campus point. Eight approximate community anchors support a reproducible, unweighted access comparison. Each facility carries coordinate/source links, quality, retrieval timestamp, dataset version and explicit clinical status.

## How AWS powers the implementation

The implemented backend uses AWS SDK v3 Amazon Location SearchNearby/SearchText through API Gateway and Lambda. Independent validated datasets are designed to be served from a private encrypted/versioned S3 bucket. Optional Python ETL supports a dedicated Glue/Iceberg table and Athena analysis. Discovery results are ephemeral, attributed and separate from the independent dataset.

**Actual deployment status:** these AWS paths have been implemented and locally built, but have not been deployed or verified live because the owner's AWS account/profile still needs setup. Do not describe them as functioning integrations until verified. The currently published frontend uses its independent bundled snapshot and OSM fallback.

Google Maps, TrafficLayer and the protected Routes backend are implemented separately, with real geometry limited to Google Maps. They also await the owner's billing-enabled project and credentials.

## What makes it distinctive

VenomLink connects record provenance to geographic planning: users can move from a facility marker to its actual evidence, then test how a declared infrastructure assumption affects sample origins. The 20-minute baseline covers 4 of 8 anchors under the stated assumptions; a hypothetical THQ eligibility upgrade raises this to 6 of 8. That is a scenario result, not proof of clinical coverage or lives saved. At a 30-minute threshold, adding the hypothetical crossing delay reduces sampled access from 5/8 to 4/8.

## Limitations and next steps

Confirm facility capabilities and antivenom inventories with actual healthcare partners; verify map-provider coverage and production routes; replace the simple geographic planning model with a validated road-network study; add population-weighted analysis only with a credible population dataset. Any future image classifier requires a trained model and independent validation and must never delay care.

## Links

- App: https://shehar-e-yaar.github.io/venomlink/
- Source: https://github.com/shehar-e-yaar/venomlink
- Figma: https://www.figma.com/design/YW6WtWs7SMQb0aGdPstddh
- Video: https://shehar-e-yaar.github.io/venomlink/demo.html — 2:46 narrated walkthrough using actual app screenshots; providers explicitly unconfigured.

Before submission: verify actual AWS Places and S3 operation, replace this status paragraph with documented evidence, replace the screenshot walkthrough with a live-provider recording under three minutes, and confirm the official challenge form and deadline.
