$rootPath = Split-Path -Parent $MyInvocation.MyCommand.Definition
$folderName = Split-Path $rootPath -Leaf
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$outputFile = Join-Path $rootPath "$folderName-structure-$timestamp.txt"

# Define patterns to exclude
$excludePatterns = @(
    "node_modules",
    "dist",
    ".next",
    "build",
    "out",
    ".cache",
    ".nuxt",
    ".output",
    "coverage",
    ".nyc_output",
    ".turbo",
    ".vercel",
    ".netlify",
    ".serverless",
    ".aws-sam",
    ".terraform",
    "prisma/migrations",  # Keep schema.prisma but exclude migrations
    "*.log",
    "*.lock",
    "*.tsbuildinfo",
    ".eslintcache",
    ".DS_Store",
    "Thumbs.db",
    "*.min.js",
    "*.min.css",
    "*.map",
    "*.tgz",
    "*.tar.gz",
    "*.wasm",
    "*.data"
)

# Define included file extensions (source code and configs)
$includeExtensions = @(
    # Backend
    ".ts", ".js", ".json", ".yml", ".yaml", ".graphql", ".gql",
    # Frontend
    ".tsx", ".jsx", ".css", ".scss", ".sass", ".less", ".html",
    # Database
    ".sql", ".prisma",
    # Config files
    ".config.js", ".config.ts", ".config.mjs", ".config.cjs",
    # Docker
    "Dockerfile", "docker-compose*.yaml", "docker-compose*.yml"
)

# Function to check if file should be included
function Should-IncludeFile {
    param([System.IO.FileInfo]$file)
    
    $relativePath = $file.FullName.Substring($rootPath.Length).TrimStart('\')
    $relativePathUnix = $relativePath -replace '\\', '/'
    
    # Check exclude patterns
    foreach ($pattern in $excludePatterns) {
        if ($pattern -like "*/*" -or $pattern -like "*\*") {
            # Path pattern
            if ($relativePath -like "*$pattern*" -or $relativePathUnix -like "*$pattern*") {
                return $false
            }
        } elseif ($relativePath -match "(\\|/)$pattern(\$|\\|/)") {
            return $false
        } elseif ($file.Name -like $pattern) {
            return $false
        }
    }
    
    # Always include key config files
    $configFiles = @(
        "package.json", "package-lock.json", "yarn.lock", "pnpm-lock.yaml",
        "tsconfig.json", "tsconfig.build.json", "tsconfig.minimal.json",
        "nest-cli.json", "eslint.config.mjs", ".eslintrc.js", ".prettierrc",
        "next.config.ts", "next.config.js", "postcss.config.mjs",
        "tailwind.config.js", "components.json", "docker-compose.yaml",
        "Dockerfile", ".env.example", ".env", "prisma/schema.prisma"
    )
    if ($configFiles -contains $file.Name) {
        return $true
    }
    
    # Check extension
    foreach ($ext in $includeExtensions) {
        if ($ext -like "*.??" -and $ext -like "*.*") {
            if ($file.Extension -eq $ext) { return $true }
        } elseif ($file.Name -like $ext) {
            return $true
        }
    }
    
    return $false
}

# === Write folder structure ===
"=== Folder Structure: $folderName ===" | Out-File $outputFile -Encoding utf8
"Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" | Out-File $outputFile -Encoding utf8 -Append
"`n" | Out-File $outputFile -Encoding utf8 -Append

# Generate custom tree structure (simplified)
function Write-CustomTree {
    param([string]$path, [string]$indent = "", [System.IO.DirectoryInfo]$parentDir = $null)
    
    $items = Get-ChildItem -Path $path | Where-Object {
        $exclude = $false
        $relPath = $_.FullName.Substring($rootPath.Length).TrimStart('\')
        foreach ($pattern in $excludePatterns) {
            if ($pattern -like "*/*" -or $pattern -like "*\*") {
                if ($relPath -like "*$pattern*") { $exclude = $true; break }
            } elseif ($_.Name -like $pattern) { $exclude = $true; break }
        }
        -not $exclude
    } | Sort-Object { $_.PSIsContainer } -Descending
    
    for ($i = 0; $i -lt $items.Count; $i++) {
        $item = $items[$i]
        $isLast = ($i -eq $items.Count - 1)
        $prefix = if ($isLast) { "└── " } else { "├── " }
        $newIndent = if ($isLast) { "    " } else { "│   " }
        
        if ($item.PSIsContainer) {
            "$indent$prefix$($item.Name)/" | Out-File $outputFile -Encoding utf8 -Append
            Write-CustomTree -path $item.FullName -indent "$indent$newIndent"
        } else {
            "$indent$prefix$($item.Name)" | Out-File $outputFile -Encoding utf8 -Append
        }
    }
}

"$folderName/" | Out-File $outputFile -Encoding utf8 -Append
Write-CustomTree -path $rootPath -indent ""

"`n=== Files Content ===`n" | Out-File $outputFile -Encoding utf8 -Append

# === Write each file's content ===
Get-ChildItem -Path $rootPath -File -Recurse | Where-Object { Should-IncludeFile $_ } | ForEach-Object {
    $relativePath = $_.FullName.Substring($rootPath.Length).TrimStart('\')
    
    "`n=== $($relativePath) ===" | Out-File $outputFile -Encoding utf8 -Append
    "Path: $($_.FullName)" | Out-File $outputFile -Encoding utf8 -Append
    "---" | Out-File $outputFile -Encoding utf8 -Append

    try {
        # Read as text, skip if too large (>5MB)
        if ($_.Length -gt 5MB) {
            "** File too large (>5MB) - skipped **" | Out-File $outputFile -Encoding utf8 -Append
        } else {
            Get-Content $_.FullName -ErrorAction Stop -Encoding UTF8 | Out-File $outputFile -Encoding utf8 -Append
        }
    }
    catch {
        "** Binary or unreadable file: $_ **" | Out-File $outputFile -Encoding utf8 -Append
    }
}

Write-Host "Generated: $outputFile" -ForegroundColor Green
Write-Host "Excluded: node_modules, dist, .next, build, migrations, logs, lock files, binaries, etc." -ForegroundColor Yellow