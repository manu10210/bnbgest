@echo off
echo.
echo ============================================
echo   NEXTAUTH_SECRET Generator
echo ============================================
echo.
echo Generating secure random secret...
echo.

REM Generate random secret using PowerShell
powershell -Command "$bytes = New-Object byte[] 32; $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create(); $rng.GetBytes($bytes); $secret = [Convert]::ToBase64String($bytes); Write-Host 'NEXTAUTH_SECRET='$secret -ForegroundColor Yellow; Set-Clipboard -Value ('NEXTAUTH_SECRET=' + $secret); Write-Host ''; Write-Host 'Secret copied to clipboard!' -ForegroundColor Green"

echo.
echo Add this to:
echo  - .env.local (local development)
echo  - Vercel Environment Variables (production)
echo.
pause
