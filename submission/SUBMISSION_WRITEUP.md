# VenomLink — Snakebite Care, Mapped

A privacy-conscious snake identification and hospital-route exploration prototype for Lahore, Pakistan.

## The problem
A nearby hospital pin does not tell you the journey time or establish that appropriate treatment is available. During a snake encounter, people also need to understand a possible species without handling the animal. VenomLink connects these questions in one explorable interface while distinguishing geographic evidence, model suggestions, and unverified clinical information.

## What we built
Upload a snake photo for real on-device classification using the supplied 498-class Snake Teller model, exported to ONNX. Images stay in the browser. Then explore a Google map of independent hospital locations, select a starting point, inspect sources, and compare traffic-aware driving routes to seven user-listed hospital leads. The app highlights the quickest returned route, with time and distance. Our recorded live test returned seven of seven routes; Mayo Hospital was quickest at 13 minutes and 4.1 miles from the selected Shahdara origin. This is an observation from that test, not a guaranteed current journey.

## Original dataset and pipeline
The dataset contains eleven source-linked facility records: ten human hospital candidates and one UVAS reference institution, excluded from human-care comparisons. Coordinates derive from OpenStreetMap and public Punjab government records. Each record carries provenance and data-quality information. No historical snake sightings are invented. Python scripts build and validate the records before private Amazon S3 storage. The browser retrieves the dataset through API Gateway and Lambda and plots the independent coordinates on Google Maps.

## Why AWS
Amazon S3 provides a reproducible, versioned dataset delivery path. API Gateway and Lambda expose the dataset and provider operations without a continuously running server. Amazon Location Service SearchNearby and SearchText provide live place discovery. Secrets Manager stores the backend route credential; scoped IAM permissions and CloudWatch logs support operations. The backend is deployed in ap-southeast-2. Athena and Iceberg scripts are optional extensions and are not deployed.

Amazon Location hospital-category searches returned zero matches around our tested Lahore origin. The interface preserves that provider result and separately offers the saved independent hospital directory; it does not relabel saved records as AWS discoveries.

## Technology and execution
React, TypeScript, Vite, Framer Motion, Google Maps and Routes, Python, and ONNX Runtime Web. The supplied species classifier runs locally; the separate RT-DETR snake-location model is intentionally excluded. A glass-inspired responsive design places the snake imagery, three-step data story, photo upload, and map at the center. Google demo access is quota-limited. Missing routes stay explicit, with external Google Maps directions available rather than invented live estimates.

## Important prototype boundaries
The displayed ten injections per hospital are SIMULATED DEMO INVENTORY, not verified physical supplies. All actual antivenom stock and treatment capabilities remain unconfirmed. Hospital leads are user-listed candidates, not medically endorsed destinations. Species predictions are possible matches, not determinations of venom, safety, or treatment. Driving estimates are not ambulance response times. Confirm real care directly. The project uses approved AWS free-plan credits; no Google billing or paid AWS upgrade was activated.

## Links
- Live application: https://shehar-e-yaar.github.io/venomlink/
- Public demo video: https://shehar-e-yaar.github.io/venomlink/demo.html
- Public source: https://github.com/shehar-e-yaar/venomlink
- Editable Figma: https://www.figma.com/design/YW6WtWs7SMQb0aGdPstddh
