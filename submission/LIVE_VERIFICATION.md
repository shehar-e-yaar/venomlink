# Live integration verification

Checked on 2 November 2026. This records observed results, not provider uptime guarantees.

| Path                         | Observed result                                                                                                                                                                                              |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| AWS deployment               | CloudFormation CREATE_COMPLETE, followed by a successful routing-mode update in Sydney                                                                                                                       |
| Independent S3 delivery      | The deployed /facilities endpoint returned 11 records and actual S3 delivery metadata for lahore-facilities-v1                                                                                               |
| Amazon Location SearchNearby | Real hospital-category requests completed with zero matches around the sample origin; the UI explains the coverage gap                                                                                       |
| Amazon Location SearchText   | Shahdara query returned one real locality result, with provider attribution and explicit non-treatment classification                                                                                        |
| Google map                   | Maps JavaScript rendered Lahore with the owner's Maps Demo Key; map/marker interactions were inspected in-browser                                                                                            |
| Selected route               | The protected Lambda returned 6,649 metres, a traffic-aware duration around 19–20 minutes, encoded geometry and five returned traffic-speed intervals for the Shahdara-to-Mayo sample. Values vary over time |
| Five-route comparison        | On-demand supported Compute Routes calls returned real estimates for the two Shahdara facilities, Mayo, Yakki Gate and Kot Khawaja Saeed. Missing estimates remain unavailable                               |
| Unsupported native matrix    | Direct test returned BILLING_DISABLED; no billing activation followed. Demo mode avoids this API method                                                                                                      |
| Unit checks                  | 14 tests passed, including scenario behavior, malformed/provider data, partial route failures, request cap, reference exclusions and origin checks                                                           |
| Builds                       | TypeScript/Vite frontend, bundled backend, SAM lint/validation and SAM build passed                                                                                                                          |

The owner's existing AWS Free plan was verified before deployment; no paid upgrade was performed. Google billing remains disabled. Backend credentials are not present in repository source. The browser credential is intentionally browser-visible. No credit balances, credential values or private billing details are included in this public receipt.

Still unverified/unavailable: clinical treatment capability, antivenom inventory, operational entrance points, ambulance response times, a trained classifier, and live Iceberg/Athena analytics. The Google demo is evaluation/testing only and quota-limited. The video uses actual screenshots with synthetic narration rather than a continuous screen recording.
