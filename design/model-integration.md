# Snake Teller browser integration

- Source: user-supplied `best_snake_teller_498cls.pt`; 498 species classes, classification task. The snake-hunter RT-DETR model is excluded.
- Served model: `public/models/snake-teller.onnx` (about 63 MiB), loaded only on the first identification request.
- Runtime: ONNX Runtime Web 1.22.0, single-thread WebAssembly. Runtime files are self-hosted under `public/models/runtime/`.
- Preprocessing: RGB; resize shortest side to 224, center crop 224, divide channels by 255, planar CHW input [1,3,224,224]. This follows the transforms stored in the user's classifier. Browser canvas interpolation can differ slightly from Pillow.
- Output: top three class scores. UI says possible species, not verified. Below 0.5 top score or a top-two margin below 0.1, UI shows uncertain. These are presentation heuristics, not validated clinical thresholds.
- Privacy: selected images stay in browser memory. No photo upload or persistence is performed.
- Numerical conversion check: all 498 outputs compared on a deterministic identical tensor. Top-1 matched; maximum absolute score difference 1.72e-7. This verifies conversion fidelity, not model accuracy.
- Browser smoke test: a local snake test image produced `Bungarus fasciatus`. This was an inference test, not an accuracy evaluation or hospital recommendation.
- Closed-set limitation: the classifier can label non-snake input as a snake. It does not locate snakes in foliage, establish venom status, or determine medical care.
- Provenance: source weights SHA-256 and class labels are recorded in `public/models/snake-teller.json`.

## Routing recovery

The frontend retains the existing backend routes. In Maps Demo mode, a backend quota response activates direct browser Compute Routes requests using the already configured public browser demo key. Requests are serialized, spaced 400 ms apart, and successful routes are retained only in memory for five minutes. A real Google refusal remains visible. No backend, AWS service, source dataset, billing plan, or secret value is changed.

Google returned a daily Compute Routes limit of 100 requests for the current demo project during testing. The browser fallback uses the same project allowance; it does not bypass daily limits. A circuit breaker stops queued requests after a quota refusal. Google Maps directions links remain available without an API key.
