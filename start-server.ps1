# Script PowerShell pour démarrer le serveur BNBGEST de manière stable
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   DEMARRAGE SERVEUR BNBGEST" -ForegroundColor Yellow
Write-Host "========================================`n" -ForegroundColor Cyan

# Étape 1: Nettoyer les processus Node
Write-Host "[1/4] Nettoyage des processus Node..." -ForegroundColor White
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Étape 2: Vérifier si le build existe
Write-Host "[2/4] Vérification du build..." -ForegroundColor White
if (-not (Test-Path ".next\BUILD_ID")) {
    Write-Host "Build manquant - Construction en cours..." -ForegroundColor Yellow
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "`n❌ ERREUR: Le build a échoué" -ForegroundColor Red
        Read-Host "Appuyez sur Entrée pour quitter"
        exit 1
    }
}

# Étape 3: Démarrer le serveur
Write-Host "[3/4] Démarrage du serveur en mode production..." -ForegroundColor White
Write-Host "`n========================================" -ForegroundColor Green
Write-Host "   ✅ SERVEUR DEMARRE" -ForegroundColor Green
Write-Host "   📍 URL: http://localhost:3000" -ForegroundColor Yellow
Write-Host "   🛑 Pour arrêter: Ctrl+C" -ForegroundColor Yellow
Write-Host "========================================`n" -ForegroundColor Green

# Démarrer en mode production (beaucoup plus stable)
npm start

# Si le serveur s'arrête
Write-Host "`n⚠ Le serveur s'est arrêté." -ForegroundColor Yellow
Read-Host "Appuyez sur Entrée pour quitter"
