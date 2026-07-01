$rootPath = Split-Path -Parent $MyInvocation.MyCommand.Definition
$folderName = Split-Path $rootPath -Leaf
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$outputFile = Join-Path $rootPath "$folderName-structure-$timestamp.txt"

# === Write folder structure ===
"=== Folder Structure: $folderName ===" | Out-File $outputFile
"Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" | Out-File $outputFile -Append
"`n" | Out-File $outputFile -Append
tree $rootPath /F | Out-File $outputFile -Append

"`n=== Files Content ===`n" | Out-File $outputFile -Append

# === Write each file's content ===
Get-ChildItem -Path $rootPath -File -Recurse |
    Where-Object { $_.Extension -ne ".txt" } |
    ForEach-Object {

        "`n=== $($_.Name) ===" | Out-File $outputFile -Append
        "Path: $($_.FullName)" | Out-File $outputFile -Append

        try {
            Get-Content $_.FullName -ErrorAction Stop | Out-File $outputFile -Append
        }
        catch {
            "** Binary or unreadable file **" | Out-File $outputFile -Append
        }
    }

Write-Host "Generated: $outputFile"