# 🔧 Upload Vidéo Mobile - Correction IP Réseau

## ✅ PROBLÈME RÉSOLU !

### 🐛 Problème identifié
Le QR code générait une URL avec `localhost:3000` qui **ne fonctionne que sur le PC**, pas sur un téléphone mobile connecté au même réseau WiFi.

### 💡 Solution implémentée
Le système détecte maintenant **automatiquement l'adresse IP locale du PC** et génère le QR code avec cette IP.

---

## 📱 Configuration actuelle

### Votre adresse IP réseau
```
192.168.1.11
```

### URL pour mobile
```
http://192.168.1.11:3000/upload-video
```

---

## 🎯 Comment utiliser

### 1️⃣ Depuis l'admin
```
1. Ouvrez http://localhost:3000/admin
2. Allez dans l'onglet "Guides Vidéo"
3. Cliquez sur "Upload Mobile" (bouton violet)
4. Le QR code s'affiche avec l'URL réseau correcte
```

### 2️⃣ Depuis le téléphone
```
1. Assurez-vous que le téléphone est sur le MÊME WiFi que le PC
2. Scannez le QR code avec l'appareil photo
3. La page d'upload s'ouvre automatiquement
4. Sélectionnez ou filmez votre vidéo
5. Uploadez !
```

---

## 🔍 Vérifications importantes

### ✅ Le PC et le téléphone doivent être sur le même réseau WiFi

**Sur PC (Windows):**
```powershell
# Vérifier votre IP
Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -like '192.168.*'}
```

**Sur téléphone:**
- Paramètres → WiFi → Appuyez sur le réseau connecté
- Vérifiez que l'IP commence par `192.168.1.x`

### ✅ Le pare-feu Windows doit autoriser le port 3000

**Ajouter une règle si nécessaire:**
```powershell
# Autoriser le port 3000 (à exécuter en tant qu'administrateur)
New-NetFirewallRule -DisplayName "Node.js Server" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow
```

### ✅ Le serveur doit être démarré

**Vérifier l'état:**
```powershell
# Vérifier si le serveur écoute
netstat -ano | findstr :3000
```

**Si rien n'apparaît, démarrer le serveur:**
```powershell
cd C:\Users\claus\BNBGEST
npm start
```

---

## 🆕 Nouveaux fichiers créés

### 1. `/app/api/network-ip/route.ts`
API qui détecte automatiquement l'adresse IP locale du PC.

**Endpoint:**
```
GET http://localhost:3000/api/network-ip
```

**Réponse:**
```json
{
  "success": true,
  "ip": "192.168.1.11",
  "url": "http://192.168.1.11:3000"
}
```

### 2. Modifications dans `EquipmentVideoQR.tsx`

**Ajouts:**
- État `networkUrl` pour stocker l'URL réseau
- `useEffect` qui récupère l'IP au chargement
- QR code mis à jour pour utiliser `networkUrl`
- Boutons "Copier" et "Ouvrir" utilisent `networkUrl`
- Affichage de l'URL complète sous le QR code

---

## 🧪 Tests de validation

### Test 1: Vérifier l'API network-ip
```powershell
Invoke-WebRequest -Uri "http://localhost:3000/api/network-ip" -UseBasicParsing | Select-Object -ExpandProperty Content
```

**Résultat attendu:**
```json
{"success":true,"ip":"192.168.1.11","url":"http://192.168.1.11:3000"}
```

### Test 2: Accès depuis le PC
```powershell
Start-Process "http://192.168.1.11:3000/upload-video"
```
✅ La page doit s'ouvrir normalement

### Test 3: Accès depuis le téléphone
1. Ouvrez le navigateur du téléphone
2. Tapez: `http://192.168.1.11:3000/upload-video`
3. ✅ La page d'upload doit s'afficher

### Test 4: Upload depuis téléphone
1. Scannez le QR code
2. Sélectionnez une vidéo (max 100MB)
3. Remplissez le titre et la catégorie
4. Cliquez "Télécharger"
5. ✅ Message de succès doit apparaître

---

## 🐛 Dépannage

### Problème: Le QR code ne scanne pas
**Solutions:**
- Augmentez la luminosité de l'écran du PC
- Rapprochez/éloignez le téléphone
- Utilisez une application de scan QR dédiée
- Copiez l'URL et ouvrez-la manuellement

### Problème: "Impossible de se connecter"
**Vérifiez:**
1. ✅ Même réseau WiFi (PC et téléphone)
2. ✅ Serveur démarré (`npm start`)
3. ✅ Pare-feu autorise le port 3000
4. ✅ IP correcte (peut changer si redémarrage routeur)

**Solution rapide:**
```powershell
# Redémarrer le serveur
Get-Process -Name node | Stop-Process -Force
cd C:\Users\claus\BNBGEST
npm start
```

### Problème: L'IP a changé
Si votre IP locale change (ex: après redémarrage du routeur):

1. Le système détecte automatiquement la nouvelle IP ✅
2. Rechargez simplement la page admin
3. Le QR code sera mis à jour automatiquement

**Pour forcer une IP statique (optionnel):**
- Paramètres Windows → Réseau → Propriétés → IPv4
- Configurer l'IP manuellement: `192.168.1.11`

---

## 📊 Différences avant/après

### ❌ AVANT (ne fonctionnait pas)
```
QR Code → http://localhost:3000/upload-video
          ❌ localhost = uniquement sur le PC
```

### ✅ APRÈS (fonctionne)
```
QR Code → http://192.168.1.11:3000/upload-video
          ✅ IP réseau = accessible depuis le téléphone
```

---

## 🎓 Explication technique

### Pourquoi `localhost` ne fonctionne pas ?

**`localhost` = 127.0.0.1**
- Signifie "cette machine uniquement"
- Le téléphone cherche le serveur sur lui-même (il n'y en a pas)

**`192.168.1.11` = IP réseau locale**
- Signifie "cette machine sur le réseau"
- Le téléphone peut atteindre le PC via le réseau WiFi

### Comment le système détecte l'IP ?

```typescript
// app/api/network-ip/route.ts
const nets = networkInterfaces();
for (const name of Object.keys(nets)) {
  for (const net of nets[name]) {
    if (net.family === 'IPv4' && !net.internal) {
      return net.address; // Ex: 192.168.1.11
    }
  }
}
```

### Comment le QR code est généré ?

```typescript
// components/EquipmentVideoQR.tsx
useEffect(() => {
  const response = await fetch('/api/network-ip');
  const data = await response.json();
  setNetworkUrl(`${data.url}/upload-video`);
}, []);

// Plus tard dans le JSX
<QRCodeSVG value={networkUrl} />
```

---

## ✅ Checklist finale

- [x] API `/api/network-ip` créée
- [x] Détection automatique de l'IP locale
- [x] QR code mis à jour avec l'IP réseau
- [x] URL affichée sous le QR code
- [x] Boutons "Copier" et "Ouvrir" utilisent l'IP réseau
- [x] Build réussi sans erreurs
- [x] Serveur démarré en production
- [x] API testée et fonctionnelle
- [x] URL réseau confirmée: `http://192.168.1.11:3000/upload-video`

---

## 🚀 Prochaines étapes

### Testez maintenant !

1. **Sur PC:**
   ```
   http://localhost:3000/admin → Guides Vidéo → Upload Mobile
   ```

2. **Sur téléphone:**
   - Scannez le QR code
   - Uploadez une vidéo test

3. **Vérifiez le résultat:**
   ```powershell
   ls C:\Users\claus\BNBGEST\public\uploads\videos
   ```

---

## 📞 Support

### En cas de problème persistant

1. **Vérifier les logs serveur:**
   - Dans la fenêtre PowerShell où tourne `npm start`

2. **Tester l'URL manuellement:**
   - Ouvrir `http://192.168.1.11:3000/upload-video` dans le navigateur du téléphone

3. **Vérifier le pare-feu:**
   ```powershell
   Get-NetFirewallRule | Where-Object {$_.LocalPort -eq 3000}
   ```

---

## 🎉 Conclusion

✅ **Le problème est résolu !**

Le QR code génère maintenant l'URL correcte avec l'IP réseau locale, permettant l'upload de vidéos depuis n'importe quel téléphone connecté au même WiFi.

**URL opérationnelle:** `http://192.168.1.11:3000/upload-video`

Scannez le QR code et uploadez vos premières vidéos ! 📱✨
