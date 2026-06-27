<# Generate a full controller route map into api-endpoints.txt
Usage: .\generate-api-endpoints.ps1
#>
<# Generate a controller route map to api-endpoints.txt
Usage:
    .\generate-api-endpoints.ps1
    .\generate-api-endpoints.ps1 -Help
#>
[CmdletBinding()]
param(
        [switch]$Help
)

function Show-Help {
        Write-Host "Usage: .\generate-api-endpoints.ps1 [-Help]"
        Write-Host "Scans backend controllers and writes a route map to scripts/ops/api-endpoints.txt."
}
. "$PSScriptRoot\_ps_ops_helpers.ps1"
Parse-HelpSwitch -Usage "Usage: .\generate-api-endpoints.ps1 [-Help]"

if ($Help) { Show-Help; return }

$RootDir = Split-Path -Parent $PSScriptRoot
$BackendSrc = Join-Path $RootDir '..\backend\src'
$Output = Join-Path $RootDir 'api-endpoints.txt'

Write-Host "Scanning controllers in $BackendSrc"

$controllerPrefix = '/api/v1'
$endpoints = [System.Collections.Generic.List[string]]::new()

Get-ChildItem -Path $BackendSrc -Recurse -Filter '*.ts' | ForEach-Object {
    $ctrl = $null
    $lines = Get-Content $_.FullName
    foreach ($line in $lines) {
        if ($line -match '@Controller\(([^)]*)\)') {
            $raw = $Matches[1].Trim()
            $raw = $raw.TrimStart("'", '"').TrimEnd("'", '"')
            if (-not $raw.StartsWith('/')) { $raw = '/' + $raw }
            $raw = $raw.TrimEnd('/')
            $ctrl = $raw
        }
        if ($line -match '@(Get|Post|Put|Delete|Patch)\(([^)]*)\)') {
            if (-not $ctrl) { continue }
            $method = $Matches[1]
            $path = $Matches[2].Trim()
            $path = $path.TrimStart("'", '"').TrimEnd("'", '"')
            if (-not $path.StartsWith('/')) { $path = '/' + $path }
            $path = $path.TrimEnd('/')
            if ($path -eq '/') { $path = '' }
            $endpoint = ($controllerPrefix + $ctrl + $path) -replace '/{2,}', '/'
            $endpoints.Add("$method $endpoint")
        }
    }
}

$unique = $endpoints | Sort-Object -Unique
$unique | Out-File -FilePath $Output -Encoding utf8
Write-Host "Generated $($unique.Count) endpoints to $Output"
