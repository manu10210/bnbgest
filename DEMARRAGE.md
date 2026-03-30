# 🚀 GUIDE DE DÉMARRAGE BNBGEST

## ⚠️ IMPORTANT - COMMENT DÉMARRER LE SERVEUR SANS PLANTAGE

### ✅ MÉTHODE RECOMMANDÉE (Stable)

**Option 1: Double-cliquer sur le fichier**
```
start-server.bat
```
OU
```
start-server.ps1
```

**Option 2: En ligne de commande**
```powershell
npm start
```

### ❌ À NE PAS UTILISER

```powershell
npm run dev  # ❌ Mode développement - INSTABLE, plante souvent
```

---

## 🔧 POURQUOI `npm run dev` PLANTE ?

Le mode développement Next.js (`npm run dev`) est **instable** pour cette application car :
- ✗ Hot reload consomme trop de mémoire
- ✗ Turbopack crash avec les gros composants (AdminDashboard, MaintenanceManagerAdvanced)
- ✗ Rechargement automatique provoque des erreurs

Le mode production (`npm start`) est **100% stable** :
- ✓ Pas de hot reload
- ✓ Code optimisé et compressé
- ✓ Consommation mémoire réduite
- ✓ Pas de crash

---

## 📋 PROCÉDURE COMPLÈTE

### 1️⃣ Première fois / Après modification du code

```powershell
# Arrêter tous les processus Node
taskkill /F /IM node.exe

# Construire le projet
npm run build

# Démarrer le serveur
npm start
```

### 2️⃣ Démarrage rapide (build existant)

```powershell
# Juste démarrer
npm start
```

### 3️⃣ En cas de problème

```powershell
# Nettoyage complet
taskkill /F /IM node.exe
Remove-Item -Path ".next" -Recurse -Force
npm run build
npm start
```

---

## 🌐 ACCÈS À L'APPLICATION

Une fois démarré, accédez à :
- **Page d'accueil**: http://localhost:3000
- **Administration**: http://localhost:3000/admin
- **Login**: http://localhost:3000/login

---

## 🛑 ARRÊTER LE SERVEUR

- Dans le terminal : `Ctrl + C`
- OU : `taskkill /F /IM node.exe`

---

## 🔄 WORKFLOW DE DÉVELOPPEMENT

### Quand vous modifiez du code :

1. **Arrêter le serveur** : `Ctrl + C`
2. **Reconstruire** : `npm run build`
3. **Redémarrer** : `npm start`
4. **Rafraîchir le navigateur** : `F5`

### Pas besoin de rebuild si vous modifiez :
- Rien ! Toujours rebuild après modification du code TypeScript/React

---

## 📊 COMPOSANTS PRINCIPAUX

L'application contient ces composants majeurs qui peuvent causer des problèmes en mode dev :

- `AdminDashboard.tsx` (1259 lignes)
- `MaintenanceManagerAdvanced.tsx` (1379 lignes)
- `SettingsManager.tsx` (1800 lignes)
- `BookingManager.tsx`
- `InventoryManager.tsx`
- Et 20+ autres composants

**Mode production** = Tous optimisés et stables
**Mode dev** = Risque de crash avec autant de composants

---

## 🎯 SCRIPTS DISPONIBLES

```json
{
  "dev": "next dev",           // ❌ NE PAS UTILISER
  "build": "next build",       // ✅ Utiliser avant chaque démarrage
  "start": "next start",       // ✅ UTILISER CELUI-CI
  "lint": "next lint"
}
```

---

## 💡 ASTUCES

### Pour éviter de rebuilder à chaque fois :
Le build est **conservé** tant que vous ne modifiez pas le code. Vous pouvez faire :
```powershell
npm start
```
plusieurs fois sans rebuilder si le code n'a pas changé.

### Pour vérifier si un build existe :
```powershell
Test-Path .next\BUILD_ID
```
Si `True`, vous pouvez faire `npm start` directement.

---

## 🆘 DÉPANNAGE

### Erreur "Port 3000 already in use"
```powershell
taskkill /F /IM node.exe
npm start
```

### Erreur "Cannot find module"
```powershell
Remove-Item -Path ".next" -Recurse -Force
npm run build
npm start
```

### Page blanche / 500 Internal Server Error
```powershell
taskkill /F /IM node.exe
Remove-Item -Path ".next" -Recurse -Force
Remove-Item -Path "node_modules\.cache" -Recurse -Force
npm run build
npm start
```

### Serveur lent
C'est normal en mode production. Le premier chargement prend ~5-10 secondes, ensuite c'est rapide.

---

## ✅ CHECKLIST DE DÉMARRAGE

- [ ] Processus Node arrêtés : `taskkill /F /IM node.exe`
- [ ] Build présent : `Test-Path .next\BUILD_ID` = True
- [ ] Si pas de build : `npm run build`
- [ ] Démarrer : `npm start`
- [ ] Attendre 5-10 secondes
- [ ] Tester : http://localhost:3000

---

## 🎉 RÉSUMÉ

**TOUJOURS UTILISER** :
```powershell
npm start
```

**JAMAIS UTILISER** :
```powershell
npm run dev  # ❌
```

**C'est tout !** 🚀
