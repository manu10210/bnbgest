# Update visual regression baseline screenshots
# Run this after intentional UI changes
# PowerShell version

Write-Host "🔄 Updating visual regression baseline screenshots..." -ForegroundColor Cyan
Write-Host ""

# Check if tests directory exists
if (-not (Test-Path "tests\visual")) {
    Write-Host "❌ Error: tests\visual directory not found" -ForegroundColor Red
    Write-Host "   Make sure you're in the project root directory" -ForegroundColor Yellow
    exit 1
}

# Confirm action
$confirmation = Read-Host "⚠️  This will update ALL baseline screenshots. Continue? (y/N)"
if ($confirmation -ne 'y' -and $confirmation -ne 'Y') {
    Write-Host "❌ Aborted" -ForegroundColor Red
    exit 1
}

# Remove old baseline
Write-Host "🗑️  Removing old baseline screenshots..." -ForegroundColor Yellow
Get-ChildItem -Path tests -Filter "*-snapshots" -Recurse -Directory | Remove-Item -Recurse -Force

# Run tests to generate new baseline
Write-Host "📸 Generating new baseline screenshots..." -ForegroundColor Yellow
npx playwright test tests/visual --update-snapshots

# Check if successful
if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Baseline updated successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📝 Next steps:" -ForegroundColor Cyan
    Write-Host "   1. Review changes: git diff tests/" -ForegroundColor White
    Write-Host "   2. Commit: git add tests/*-snapshots/" -ForegroundColor White
    Write-Host "   3. Commit: git commit -m 'chore: update visual regression baseline'" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "❌ Failed to update baseline" -ForegroundColor Red
    Write-Host "   Check errors above and try again" -ForegroundColor Yellow
    exit 1
}
