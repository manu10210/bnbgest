@echo off
echo ========================================
echo   DEMARRAGE SERVEUR BNBGEST
echo ========================================
echo.

REM Nettoyer les processus Node existants
echo [1/4] Nettoyage des processus...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

REM Vérifier si le build existe
echo [2/4] Verification du build...
if not exist ".next\BUILD_ID" (
    echo Build manquant - Construction en cours...
    call npm run build
    if errorlevel 1 (
        echo ERREUR: Le build a echoue
        pause
        exit /b 1
    )
)

REM Démarrer le serveur en mode production
echo [3/4] Demarrage du serveur...
echo.
echo ========================================
echo   SERVEUR DEMARRE
echo   URL: http://localhost:3000
echo   Pour arreter: Ctrl+C
echo ========================================
echo.

REM Démarrer avec npm start (mode production stable)
call npm start

REM Si le serveur s'arrête
echo.
echo Le serveur s'est arrete.
pause
