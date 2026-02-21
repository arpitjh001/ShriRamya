# PowerShell script to push changes to GitHub
$ErrorActionPreference = "Continue"

Set-Location "c:\Users\Lenovo\shriramya\ShriRamya"

Write-Host "Attempting to push to GitHub..." -ForegroundColor Cyan
Write-Host "Repository: https://github.com/arpitjh001/ShriRamya.git" -ForegroundColor Gray

# Try to push with --no-edit and --force-with-lease
& git push origin main --force-with-lease 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nPush successful!" -ForegroundColor Green
    Write-Host "Commit(s) uploaded to GitHub" -ForegroundColor Green
} else {
    Write-Host "`nPush may have issues (exit code: $LASTEXITCODE)" -ForegroundColor Yellow
    Write-Host "Details above ^^" -ForegroundColor Yellow
}

# Show status
Write-Host "`n--- Git Status ---" -ForegroundColor Cyan
& git status

Write-Host "`n--- Recent Commits ---" -ForegroundColor Cyan
& git --no-pager log --oneline -3
