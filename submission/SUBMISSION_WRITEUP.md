# VenomLink — Snakebite Care & Healthcare Accessibility Atlas

## The problem

A hospital marker establishes a location, not suitable care or reliable access. In Lahore, river crossings, driving conditions and uncertain facility capability make distance alone an inadequate planning measure. VenomLink connects inspectable facility evidence, real road estimates and explicit infrastructure scenarios.

## What people can explore

An interactive map displays independently sourced hospital candidates. Users can select an origin, inspect a record's original sources, request a real driving route, compare up to five nearby candidates, and test a hypothetical Ravi crossing delay/closure or Shahdara Town THQ eligibility upgrade. A semicircular gauge recalculates access across eight sample communities.

The twenty-minute illustrative baseline covers 4/8 sample communities; the hypothetical THQ eligibility change raises that to 6/8. At thirty minutes a hypothetical crossing delay changes sampled access from 5/8 to 4/8. These values come from declared assumptions, not population analysis or proof of treatment availability. Scenario changes affect the planning model, not Google's reported road conditions.

## Original dataset

Eleven independent records: ten human-hospital candidates and one UVAS reference point. Sources combine a saved OSM extract, public Punjab government coordinates and hospital-name documents, with an approximate UVAS campus point. Eight approximate community anchors support reproducible comparisons. Every facility includes coordinate provenance, quality, retrieval timestamp, dataset version and clinical status. All snakebite-treatment capability and antivenom-stock fields remain unknown; UVAS is excluded from human-care comparisons. No historical sightings are invented.

## Functioning AWS services

The deployed Sydney backend uses Amazon Location SearchNearby/SearchText through API Gateway and Lambda. Python validation uploads the independent dataset to a private encrypted/versioned S3 bucket; the app retrieves all eleven records through the deployed API with actual S3 delivery metadata. Secrets Manager holds the authorized backend route credential, readable only through the function's scoped role permission.

Live hospital-category searches returned zero matches around the sample origin. A live SearchText query returned the Shahdara locality. The UI preserves that distinction: a locality is not medical care, and zero provider matches do not imply hospitals are absent. AWS responses remain ephemeral, attributed and separate from the independent map dataset.

## Real routing within a zero-cash prototype

The owner supplied a no-billing Google Maps Demo Key. Actual tests verified map rendering, a traffic-aware Compute Routes estimate, encoded road geometry and returned speed intervals. An on-demand comparison returned real estimates for five hospital candidates. The native computeRouteMatrix API rejected the demo key with BILLING_DISABLED, so demo mode uses up to five supported Compute Routes calls instead. No Google billing was enabled, and the AWS account remains on its existing Free plan using credits.

Google geometry is rendered only on Google Maps, with attribution. The OSM fallback shows independent illustrative paths only. Quota/provider failures stay explicit rather than becoming synthetic estimates. Driving times are not ambulance response times and do not verify care suitability.

## Craft and reproducibility

The warm cream/amber bento interface includes a dominant map, source-flip card, semicircular gauge, dark searchable directory, responsive layouts and explicit provider/error states. The public repository contains source data, Python validation/ETL, SAM infrastructure, tests, setup instructions, editable Figma construction source and a narrated walkthrough using actual application screenshots.

## Limits and next steps

The Maps Demo Key is strictly for evaluation/testing and can pause at its usage cap; it is not a production service. Independent clinical verification and real healthcare partnerships are still needed. Photo-helper illustrations and local previews are not AI inference; no trained classifier is connected. Glue/Iceberg/Athena scripts are optional extensions, not deployed integrations. Further work would validate facility capabilities, inventory and road-model assumptions before any operational healthcare use.

## Links

- [Application](https://shehar-e-yaar.github.io/venomlink/)
- [Public walkthrough](https://shehar-e-yaar.github.io/venomlink/demo.html)
- [Source](https://github.com/shehar-e-yaar/venomlink)
- [Figma](https://www.figma.com/design/YW6WtWs7SMQb0aGdPstddh)

The owner should review the write-up, video and official entry form before final submission. No claim of clinical validation or guaranteed competition outcome is made.
