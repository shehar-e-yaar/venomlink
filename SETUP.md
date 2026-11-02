# Connect live providers

Current state: no AWS profile or billing-enabled Google project has been supplied. The deployed frontend is a functional, clearly labeled demo. The steps below require the account owner to complete account/billing setup; do not paste secrets into chat or commit them.

## 1. AWS account and tools

Use an AWS account with billing configured, a region supporting Amazon Location Places v2 (the template defaults to your deployment region), and install the official AWS CLI and AWS SAM CLI. Authenticate using a local profile/SSO. Verify the selected account with `aws sts get-caller-identity`. Set a budget/usage limit appropriate to your account; actual provider use incurs the provider's current charges.

Build the Lambda package from this repository:

```sh
npm ci
npm run backend:build
sam validate --lint --template-file infrastructure/template.yaml
sam build --template-file infrastructure/template.yaml
sam deploy --guided
```

Choose stack name `venomlink`, appropriate region, and exact `FrontendOrigin` such as `https://shehar-e-yaar.github.io` (no `/venomlink/` path). A local frontend uses `http://127.0.0.1:5190`. Supply the Routes secret ARN once it exists; an empty ARN allows AWS data/discovery deployment without Google Routes. The template creates a private retained S3 bucket, API Gateway, Lambda, IAM policy and a seven-day log group. Review the change set before deploying into your account. The deployer needs CloudFormation/SAM resource creation permissions; optional Iceberg ETL requires separate S3/Glue permissions.

The bundled artifact is `build/handler.js` (CommonJS, no package.json in that directory) with Lambda handler `handler.handler`.

Upload the independent data using the `IndependentDataBucket` output:

```sh
python -m pip install boto3
python pipeline/etl_to_s3_iceberg.py --bucket YOUR_OUTPUT_BUCKET --region YOUR_REGION --upload
```

The Lambda reads only the validated facilities and planning-community objects. It never ingests provider search or routing results. The S3 bucket is retained on stack removal; remove its contents and bucket separately if no longer required.

## 2. Google Maps and Routes

Create/select a billing-enabled Google Cloud project. Enable Maps JavaScript API and Routes API. Create two separately restricted credentials:

- Browser key: Maps JavaScript API only, HTTP-referrer restriction to your exact published site and local preview. Set provider quotas. A Maps map ID is optional; `DEMO_MAP_ID` is the development default.
- Server key: Routes API only, stored in AWS Secrets Manager, never a `VITE_*` variable. A fixed egress IP restriction requires corresponding network infrastructure; the provided non-VPC Lambda does not have a fixed outbound IP. Add stronger backend access controls before broader operational use.

Using the AWS console, create a secret with JSON `{ "apiKey": "YOUR_ROUTES_SERVER_KEY" }`. Pass its ARN into `GoogleRoutesSecretArn` on SAM deployment. The browser cannot retrieve this secret. Secret rotation requires a Lambda environment refresh/new execution environment because the key is cached per instance.

## 3. Frontend configuration

Copy `.env.example` to `.env.local`. Fill in the restricted browser key and actual `ApiBaseUrl` stack output:

```dotenv
VITE_GOOGLE_MAPS_BROWSER_KEY=restricted_browser_key
VITE_GOOGLE_MAP_ID=your_map_id_or_DEMO_MAP_ID
VITE_API_BASE_URL=https://your-api.execute-api.your-region.amazonaws.com/api
VITE_ROUTE_REFRESH_MS=300000
VITE_BASE_PATH=/venomlink/
```

Run tests and build, then deploy `dist`. `amplify.yml` supports an Amplify frontend if desired; the current demo uses GitHub Pages. Provider configuration is compiled at build time. Redeploying only the backend does not configure the published browser.

## 4. Verify actual operation

1. Open Sources: it must say **Amazon S3** with the real delivery bucket/key, not bundled snapshot.
2. Choose Shahdara. Open AWS Discovery, SearchNearby, then SearchText for a hospital. Confirm real results, provider attribution and current response timestamp. Empty/unsupported results are not replaced with invented records.
3. Confirm Google Maps loads with visible provider attribution; enable TrafficLayer. An initialized map does not prove traffic coverage on every road.
4. Select a human hospital and refresh. Confirm real matrix duration/distance and selected-route geometry on Google Maps. Traffic interval colors appear only when returned. A route does not establish clinical capability.
5. Move origin and verify superseded results clear. Test provider quota/auth failure: the app must report unavailable. Confirm Google routes are never rendered on the OSM fallback.
6. Capture these real responses in the demo video before describing integrations as operational.

## Optional analytics

Install `pipeline/requirements.txt`. The `--iceberg` flag writes only to the dedicated `venomlink.independent_facilities_v1` Glue table and overwrites that table's current snapshot with the validated independent dataset. Use it only in the intended demo namespace. Configure an Athena workgroup/result bucket separately and run `infrastructure/analytics.sql`. These extensions are not deployed by the SAM template and have not been verified live.

## Completion gates

The local/public demo, source and 2:46 narrated screenshot walkthrough can be reviewed now. AWS Places + S3 live verification, Google traffic/routes verification and the final challenge submission remain outstanding. Replace the current walkthrough with a recording showing verified live responses after setup. Account creation, billing acceptance and the final hackathon form require the owner's action where requested by the provider.
