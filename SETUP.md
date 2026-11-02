# Setup and deployment

## Current prototype

The AWS backend is deployed in **ap-southeast-2 (Sydney)**. The current owner explicitly approved using existing AWS Free-plan credits only. Google billing remains disabled. A Maps Demo Key supports map rendering and selected Compute Routes calls; comparisons use up to five supported route calls on demand because the native matrix method requires billing.

The public app is a quota-limited hackathon prototype, not a production care service. Never upgrade an account or attach paid billing as part of this setup without the owner's explicit authorization.

## Installed tools and local development

AWS CLI v2, AWS SAM CLI, Google Cloud CLI, Node, Git, Python and Docker are available on the owner's laptop. Open a fresh terminal after installation, or run `. .\pipeline\use-cloud-tools.ps1` from this repository. The helper selects the isolated Node 22 runtime under .tools/node22 when present; it does not replace system Node 24.

```sh
npm ci
npm test
npm run dev
```

For Windows Python data tools:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r pipeline/requirements.txt
.\.venv\Scripts\python.exe pipeline/validate_facilities.py
```

Dependencies include CRT support for temporary aws login credentials, boto3, Glue/PyIceberg and Arrow's S3 implementation. Optional analytics dependencies do not imply deployed analytics resources.

## Account sign-in

```sh
aws login --profile venomlink --region ap-southeast-2
gcloud auth login
```

Use your existing project's selected AWS region. The owner's AWS project rejected login in Mumbai and accepted Sydney. Enter passwords/verification codes only in the providers' sign-in pages. No permanent AWS access keys are required by this workflow.

## No-billing Google demo path

Request a [Maps Demo Key](https://developers.google.com/maps/documentation/javascript/demo-key) using the provider's own flow. The owner must review/accept its terms. Supported features include Maps JavaScript rendering and Compute Routes; unsupported API methods must not trigger automatic billing activation. Google says demo usage pauses when its daily cap is reached without charges.

Keep the browser key in gitignored .env.local. For the backend copy, use Secrets Manager only with the owner's authorization; provide a JSON secret with an apiKey property. Never print or commit the key. The browser copy is necessarily visible to browser clients. The private backend copy is read through the function role's exact-secret permission.

```dotenv
VITE_GOOGLE_MAPS_BROWSER_KEY=your_demo_key
VITE_GOOGLE_MAPS_DEMO_MODE=true
VITE_GOOGLE_MAP_ID=DEMO_MAP_ID
VITE_API_BASE_URL=https://your-api.execute-api.ap-southeast-2.amazonaws.com/api
VITE_ROUTE_REFRESH_MS=300000
VITE_BASE_PATH=/venomlink/
```

No Google billing account is needed for this supported demo path. Standard production keys and the native matrix API are separate, billing-enabled options and are not activated here. Demo use is strictly for evaluation/testing, not production.

## Deploy within approved AWS free credits

The Lambda package is build/handler.js, bundled CommonJS for Node 22, with handler handler.handler. Use the guarded Windows helper:

```powershell
.\pipeline\deploy-free-plan.ps1 -GoogleRoutesSecretArn YOUR_AUTHORIZED_SECRET_ARN -PrepareOnly
```

Inspect the change set. After the owner authorizes deployment under the existing Free-plan credits, run the same command without PrepareOnly. The helper verifies FREE/ACTIVE and a minimum credit reserve, builds and validates the package, and deploys in Sydney with GoogleMapsDemoMode=true. It contains no plan-upgrade or Google-billing commands. Usage consumes finite credits; free-plan expiry/exhaustion affects availability. It is not permanent free hosting.

The template creates a private encrypted/versioned dataset bucket, HTTP API, Lambda, restricted role and seven-day logs. SAM also maintains an artifact bucket. The route secret is separately created with owner authorization. Reserved concurrency is omitted by default for new accounts with small initial limits. API rate throttling remains enabled.

Upload independently sourced data using the output bucket:

```powershell
$env:AWS_PROFILE='venomlink'
.\.venv\Scripts\python.exe pipeline/etl_to_s3_iceberg.py --bucket YOUR_OUTPUT_BUCKET --region ap-southeast-2 --upload
```

Only independent data is uploaded, never Google route content or AWS Places results. The dataset bucket is retained on stack deletion; account for its versions when intentionally cleaning up the project's data. Do not remove resources belonging to other projects.

## Verify and publish

Check actual S3 delivery metadata, AWS Discovery responses, Google map rendering, the selected route's duration/distance/intervals, and an on-demand five-route comparison. In current tests, AWS hospital searches returned zero while an area search returned the real Shahdara locality. A locality is not a treatment facility; zero provider matches do not mean hospitals are absent.

Build the frontend with the intended base path and API URL. GitHub Pages uses /venomlink/; local preview uses /. Local development origins on port 5190 and the exact published origin are allowed by the API. Keep .env.local, .venv, .tools, build and .aws-sam outside Git. Public static builds necessarily include the browser demo key; repository source must not contain credentials.

Optional Iceberg/Athena scripts remain extensions, not verified cloud paths. No trained snake classifier or confirmed clinical capabilities/stocks are supplied. Record a public video under three minutes and review the final hackathon submission before posting it.
