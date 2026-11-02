# Dot-source this file to refresh installed CLI paths in the current terminal:
# . .\pipeline\use-cloud-tools.ps1
$venomProjectRoot = Split-Path $PSScriptRoot -Parent
$venomToolPaths = @(
    (Join-Path $env:ProgramFiles 'Amazon\AWSCLIV2'),
    (Join-Path $env:ProgramFiles 'Amazon\AWSSAMCLI\bin'),
    (Join-Path $env:LOCALAPPDATA 'Google\Cloud SDK\google-cloud-sdk\bin')
)
if (${env:ProgramFiles(x86)}) {
    $venomToolPaths += Join-Path ${env:ProgramFiles(x86)} 'Google\Cloud SDK\google-cloud-sdk\bin'
}
$venomNodeRoot = Join-Path $venomProjectRoot '.tools\node22'
if (Test-Path -LiteralPath $venomNodeRoot) {
    $venomNode = Get-ChildItem -LiteralPath $venomNodeRoot -Directory -Filter 'node-v22.*-win-x64' |
        Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if ($venomNode) { $venomToolPaths = @($venomNode.FullName) + $venomToolPaths }
}
$venomToolPaths = @($venomToolPaths | Where-Object { Test-Path -LiteralPath $_ })
$venomRegistryPath = @([Environment]::GetEnvironmentVariable('Path','Machine'),[Environment]::GetEnvironmentVariable('Path','User')) -join ';'
$env:Path = ($venomToolPaths -join ';') + ';' + $venomRegistryPath + ';' + $env:Path
Write-Host 'Cloud tools are available in this terminal.'
