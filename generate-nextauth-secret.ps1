# Script PowerShell pour générer un NEXTAUTH_SECRET sécurisé

Write-Host "`n🔐 Génération d'un NEXTAUTH_SECRET sécurisé...`n" -ForegroundColor Cyan

# Générer un secret aléatoire de 32 bytes
$bytes = New-Object byte[] 32
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($bytes)
$secret = [Convert]::ToBase64String($bytes)

Write-Host "✅ Secret généré avec succès !" -ForegroundColor Green
Write-Host "`n════════════════════════════════════════════════════════" -ForegroundColor DarkGray
Write-Host "NEXTAUTH_SECRET=$secret" -ForegroundColor Yellow
Write-Host "════════════════════════════════════════════════════════`n" -ForegroundColor DarkGray

Write-Host "📋 Copiez cette valeur dans:" -ForegroundColor White
Write-Host "   • .env.local (développement local)" -ForegroundColor Gray
Write-Host "   • Vercel Environment Variables (production)" -ForegroundColor Gray
Write-Host "`n💡 Ce secret est unique et sécurisé. Ne le partagez jamais !`n" -ForegroundColor Cyan

# Copier automatiquement dans le presse-papiers
Set-Clipboard -Value "NEXTAUTH_SECRET=$secret"
Write-Host "✅ Secret copié dans le presse-papiers !`n" -ForegroundColor Green
