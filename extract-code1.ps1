# Get the directory where the script is located
$rootPath = Split-Path -Parent $MyInvocation.MyCommand.Definition
$folderName = Split-Path $rootPath -Leaf
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$outputFile = Join-Path $rootPath "$folderName-code-export-$timestamp.txt"

# === 1. Write folder structure ===
"=== Folder Structure: $folderName ===" | Out-File $outputFile
"Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" | Out-File $outputFile -Append
"`n" | Out-File $outputFile -Append

# Note: 'tree' shows everything. Filtering the tree text output is complex, 
# so the file content filtering below is where the cleanup happens.
tree $rootPath /F | Out-File $outputFile -Append

"`n=== Files Content ===`n" | Out-File $outputFile -Append

# === 2. Define Configuration ===

# Directories we want to KEEP (Frontend, Backend, Database)
$targetDirs = @(
    "$rootPath\backend",
    "$rootPath\frontend",
    "$rootPath\prisma"
)

# Directories we want to IGNORE (Dependencies, Build Outputs, Logs)
$ignoreFolders = @(
    "node_modules",
    "dist",
    "build",
    ".next",
    ".turbo",
    "coverage",
    "logs",
    ".git"
)

# File extensions to KEEP (Code & Config)
$allowedExtensions = '\.(ts|tsx|js|jsx|json|css|scss|html|md|sql|prisma|yml|yaml|env|txt|mdx|graphql|sh|ps1)$'

# === 3. Process and Write Files ===

Get-ChildItem -Path $rootPath -File -Recurse |
    Where-Object {
        $fullPath = $_.FullName
        
        # A. Exclude files inside ignored folders (e.g., node_modules)
        foreach ($ignore in $ignoreFolders) {
            if ($fullPath -like "*\$ignore\*") { return $false }
        }

        # B. Check if file is in one of our target directories
        $isInTarget = $false
        foreach ($target in $targetDirs) {
            if ($fullPath -like "$target\*") {
                $isInTarget = $true
                break
            }
        }

        # C. Allow root-level config files (like docker-compose.yaml, database-init.txt)
        $isRootConfig = ($_.DirectoryName -eq $rootPath) -and ($_.Name -match '\.(yaml|yml|json|env|txt|md|dockerfile|sql)$')

        # D. Check if file extension is valid code/text
        $ext = $_.Extension.ToLower()
        $isCodeFile = ($ext -eq "") -or ($ext -match $allowedExtensions)

        # Return True if it's a target file OR a root config, AND it is a code file
        return ($isInTarget -or $isRootConfig) -and $isCodeFile
    } |
    Sort-Object FullName | # Sort for consistency
    ForEach-Object {
        "`n=== $($_.Name) ===" | Out-File $outputFile -Append
        "Path: $($_.FullName)" | Out-File $outputFile -Append

        try {
            # Safety check: Don't read files larger than 2MB
            if ($_.Length -lt 2MB) {
                Get-Content $_.FullName -Raw -ErrorAction Stop | Out-File $outputFile -Append
            } else {
                "** Skipped: File too large ($($_.Length) bytes) **" | Out-File $outputFile -Append
            }
        }
        catch {
            "** Binary or unreadable file **" | Out-File $outputFile -Append
        }
    }

Write-Host "Script Complete!" -ForegroundColor Green
Write-Host "Generated: $outputFile"