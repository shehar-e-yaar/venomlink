param(
    [string]$Profile='venomlink',
    [string]$Region='ap-southeast-2',
    [string]$StackName='venomlink',
    [string]$FrontendOrigin='https://shehar-e-yaar.github.io',
    [string]$GoogleRoutesSecretArn='',
    [double]$MinimumCredits=10,
    [switch]$PrepareOnly
)
$ErrorActionPreference='Stop'
. "$PSScriptRoot/use-cloud-tools.ps1"
Push-Location (Split-Path $PSScriptRoot -Parent)
try {
    $plan=aws freetier get-account-plan-state --profile $Profile --region us-east-1 --output json | ConvertFrom-Json
    if($LASTEXITCODE -ne 0 -or $plan.accountPlanType -ne 'FREE' -or $plan.accountPlanStatus -ne 'ACTIVE' -or $plan.accountPlanRemainingCredits.amount -lt $MinimumCredits){throw 'Active Free plan with sufficient credits is required. No deployment performed.'}
    Write-Host 'Free-plan guard passed. This script never upgrades the account or enables Google billing.'
    $env:SAM_CLI_TELEMETRY='0'
    npm run backend:build
    if($LASTEXITCODE -ne 0){throw 'Backend build failed'}
    sam validate --lint --region $Region --template-file infrastructure/template.yaml
    if($LASTEXITCODE -ne 0){throw 'Template validation failed'}
    sam build --template-file infrastructure/template.yaml --region $Region
    if($LASTEXITCODE -ne 0){throw 'SAM build failed'}
    $deployArguments=@('deploy','--template-file','.aws-sam/build/template.yaml','--stack-name',$StackName,'--region',$Region,'--profile',$Profile,'--resolve-s3','--capabilities','CAPABILITY_IAM','--parameter-overrides',"FrontendOrigin=$FrontendOrigin",'ReservedFunctionConcurrency=0','GoogleMapsDemoMode=true',"GoogleRoutesSecretArn=$GoogleRoutesSecretArn",'--no-fail-on-empty-changeset')
    if($PrepareOnly){$deployArguments+='--no-execute-changeset'}
    & sam @deployArguments
    if($LASTEXITCODE -ne 0){throw 'Deployment did not complete'}
} finally { Pop-Location }
