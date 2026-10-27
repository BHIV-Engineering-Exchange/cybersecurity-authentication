# PowerShell script to update all hardcoded localhost URLs to use apiUrl helper
# This script will:
# 1. Find all .tsx and .ts files with hardcoded localhost URLs
# 2. Add the apiUrl import if not present
# 3. Replace all hardcoded URLs with apiUrl() calls

$frontendSrc = "c:\Users\pc45\Desktop\Yashika\cybercrime\frontend\src"

# Files that need updating (from grep search results)
$filesToUpdate = @(
    "components\auth\AdminLogin.tsx",
    "components\auth\InvestigatorLogin.tsx",
    "components\auth\InvestigatorLoginForm.tsx",
    "components\auth\ResetPassword.tsx",
    "components\admin\AccessRequestsContent.tsx",
    "components\admin\AIFraudDetectionContent.tsx",
    "components\admin\DashboardContent.tsx",
    "components\admin\ComplaintsViewContent.tsx",
    "components\admin\ManualInvestigatorContent.tsx",
    "components\admin\RLEngineContent.tsx",
    "components\admin\WalletFraudAnalysis.tsx",
    "components\admin\FraudDetectionContent.tsx",
    "components\admin\InvestigatorActivityContent.tsx",
    "components\admin\InvestigatorCommunicationContent.tsx",
    "components\admin\InvestigatorStatusContent.tsx",
    "components\admin\EvidenceLibraryContent.tsx",
    "components\admin\EscalationsContent.tsx",
    "components\investigator\InvestigatorDashboard.tsx",
    "components\investigator\IncidentReportDisplay.tsx"
)

$updatedCount = 0
$filesProcessed = 0

foreach ($relPath in $filesToUpdate) {
    $filePath = Join-Path $frontendSrc $relPath
    
    if (-not (Test-Path $filePath)) {
        Write-Host "File not found: $filePath" -ForegroundColor Yellow
        continue
    }
    
    $filesProcessed++
    $content = Get-Content $filePath -Raw -Encoding UTF8
    $originalContent = $content
    
    # Check if file has hardcoded URLs
    if ($content -notmatch 'http://localhost:3000') {
        Write-Host "No hardcoded URLs in: $relPath" -ForegroundColor Gray
        continue
    }
    
    # Add import if not present
    if ($content -notmatch "from ['""]@/lib/api['""]") {
        # Find the last import statement
        $importPattern = '(?m)^import\s+.*?from\s+[''"].*?[''"];?\s*$'
        $lastImportMatch = [regex]::Matches($content, $importPattern) | Select-Object -Last 1
        
        if ($lastImportMatch) {
            $insertPosition = $lastImportMatch.Index + $lastImportMatch.Length
            $newImport = "`r`nimport { apiUrl } from `"@/lib/api`";"
            $content = $content.Insert($insertPosition, $newImport)
        }
    }
    
    # Replace all hardcoded URLs with apiUrl() calls
    # Pattern: "http://localhost:3000/api/v1/..." -> apiUrl("...")
    $content = $content -replace '"http://localhost:3000/api/v1/([^"]+)"', 'apiUrl("$1")'
    $content = $content -replace '`http://localhost:3000/api/v1/([^`]+)`', 'apiUrl(`$1`)'
    
    # Save if changed
    if ($content -ne $originalContent) {
        Set-Content -Path $filePath -Value $content -Encoding UTF8 -NoNewline
        $updatedCount++
        Write-Host "✓ Updated: $relPath" -ForegroundColor Green
    } else {
        Write-Host "No changes needed: $relPath" -ForegroundColor Gray
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "Files processed: $filesProcessed" -ForegroundColor White
Write-Host "Files updated: $updatedCount" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
