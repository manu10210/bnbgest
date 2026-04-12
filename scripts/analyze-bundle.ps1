# Bundle Analysis Script (PowerShell)
# Session 21: Performance Testing

Write-Host "🔍 BUNDLE ANALYSIS" -ForegroundColor Cyan
Write-Host "══════════════════════════════════════`n" -ForegroundColor Cyan

# Check if build exists
if (-not (Test-Path ".next")) {
    Write-Host "⚠️  No build found. Building project first...`n" -ForegroundColor Yellow
    $env:ANALYZE = "true"
    npm run build
} else {
    Write-Host "✅ Build found, analyzing bundles...`n" -ForegroundColor Green
    $env:ANALYZE = "true"
    npm run build
}

Write-Host "`n✅ Bundle analysis complete!" -ForegroundColor Green
Write-Host "📊 Check the browser window for interactive visualization" -ForegroundColor Cyan
