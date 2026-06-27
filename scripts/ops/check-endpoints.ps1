<# Checks a list of endpoints (Windows PowerShell)
Usage: .\check-endpoints.ps1
#>
[CmdletBinding()]
param()

$Hosts = @(
    'https://voidcloud.cc.cd',
    'https://api.voidcloud.cc.cd/api/v1/health',
    'https://api.voidcloud.cc.cd/api/v1/auth/login'
)

Write-Host "Checking endpoints..."
foreach ($h in $Hosts) {
    Write-Host "- $h"
    try {
        $r = Invoke-WebRequest -Uri $h -UseBasicParsing -Method GET -ErrorAction Stop
        Write-Host '  OK' -ForegroundColor Green
    }
    catch {
        Write-Host "  FAIL: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`nPost auth/login with dummy payload (expected 4xx)"
$body = @{ email = 'bad@example.com'; password = 'bad' } | ConvertTo-Json
try {
    $resp = Invoke-RestMethod -Uri 'https://api.voidcloud.cc.cd/api/v1/auth/login' -Method Post -ContentType 'application/json' -Body $body -ErrorAction Stop
    Write-Host "  Unexpected success: $($resp | ConvertTo-Json -Depth 2)" -ForegroundColor Yellow
}
catch {
    if ($_.Exception.Response) {
        $status = ($_.Exception.Response).StatusCode.value__
        Write-Host "  Response status: $status" -ForegroundColor Yellow
    }
    else {
        Write-Host "  Request failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}
