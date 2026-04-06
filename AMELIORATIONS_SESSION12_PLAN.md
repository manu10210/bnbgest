# 🚀 Session 12 : React Hooks Dependencies Optimization

**Date:** 6 avril 2026  
**Objectif:** Optimiser les dependency arrays manquantes pour éviter re-renders inutiles  
**Cible:** useCallback/useMemo sans dépendances ou avec dépendances incomplètes

---

## 📊 Analyse Préliminaire

### Recherche effectuée
```bash
grep -r "useCallback\(\(\)" components/
grep -r "useState.*\[\]|useState.*\{\}" components/
```

### Observations Clés

#### 🟡 useCallback sans dépendances (Potentiellement problématique)
- **CleaningChecklist.tsx** : 7 useCallback() avec dépendances potentiellement manquantes
- **CleaningGallery.tsx** : 1 useCallback() 
- **GuestManager.tsx** : 1 useCallback()
- **ContractGenerator.tsx** : 3 useCallback()
- **GlobalSearch.tsx** : 1 useCallback()

#### 🟢 useMemo avec dépendances (Déjà bien fait)
- InteractiveCalendar.tsx : useMemo correctement utilisé
- BookingManager.tsx : useMemo avec bonnes dépendances
- ReviewsManager.tsx : Pattern optimal

#### ⚠️ Pattern à vérifier
```typescript
// POTENTIELLEMENT PROBLÉMATIQUE
const createSession = useCallback(() => {
  // Utilise selectedPropertyId, newSession, etc.
  // Mais dépendances non spécifiées
}, []); // ❌ Array vide = pas de re-création

// OPTIMAL
const createSession = useCallback(() => {
  // ...code...
}, [selectedPropertyId, newSession, setSession]); // ✅ Dépendances complètes
```

---

## 🎯 Approche de Session 12

**ATTENTION:** Cette session est **INSPECTION-ONLY** d'abord !

### Phase 1 : Analyse (Ne PAS modifier encore)
1. ✅ Identifier useCallback avec `[]` vide
2. ✅ Lire le code de chaque fonction
3. ✅ Détecter les valeurs externes utilisées
4. ✅ Documenter si problème réel ou pattern acceptable

### Phase 2 : Décision Stratégique
- **Si aucun bug détecté** : Documenter et ignorer (pattern acceptable)
- **Si re-renders excessifs** : Corriger dépendances
- **Si stale closures** : Ajouter dépendances manquantes

### Phase 3 : Fixes Ciblés (Si nécessaire)
- Corriger UNIQUEMENT les hooks problématiques
- Éviter over-optimization
- Garder code lisible

---

## 🔍 Candidates à Inspecter (Priorité)

### 1. CleaningChecklist.tsx (7 useCallback)

**Lignes à inspecter:**
- `createSession` (ligne 372)
- `startSession` (ligne 413)
- `pauseSession` (ligne 431)
- `resumeSession` (ligne 444)
- `completeSession` (ligne 459)
- `resetSession` (ligne 527)
- `exportToPDF` (ligne 550)

**Questions:**
- Utilise-t-il `sessions`, `selectedPropertyId` ?
- Y a-t-il des stale closures ?
- Re-renders excessifs observés ?

**Hypothèse:** Probablement OK car localStorage pattern établi, mais à vérifier.

---

### 2. GuestManager.tsx (1 useCallback)

**Ligne à inspecter:**
- `handleSaveGuest` (ligne 338)

**Questions:**
- Utilise `editForm`, `guests` ?
- Context BNB bien géré ?

**Hypothèse:** Probablement OK (context stable).

---

### 3. ContractGenerator.tsx (3 useCallback)

**Lignes à inspecter:**
- `addClause` (ligne 252)
- `addHouseRule` (ligne 269)
- `saveAsTemplate` (ligne 286)

**Questions:**
- Accès à `templates`, `history` ?
- Pattern localStorage similaire à Cleaning ?

**Hypothèse:** Probablement OK.

---

### 4. GlobalSearch.tsx (1 useCallback)

**Ligne à inspecter:**
- `handleClear` (ligne 326)

**Questions:**
- Simple reset state ?
- Pas de dépendances externes ?

**Hypothèse:** Probablement OK (fonction simple).

---

## 🚨 Red Flags à Chercher

### Pattern Problématique #1 : Stale Closure
```typescript
const [count, setCount] = useState(0);

const increment = useCallback(() => {
  console.log(count); // ❌ STALE ! Toujours 0
  setCount(count + 1); // ❌ PROBLÈME
}, []); // Array vide = closure sur count initial

// FIX
const increment = useCallback(() => {
  setCount(prev => prev + 1); // ✅ Fonction updater
}, []); // OK car pas d'accès direct à count

// OU
const increment = useCallback(() => {
  console.log(count); // ✅ À jour
  setCount(count + 1); // ✅ OK
}, [count]); // Dépendance déclarée
```

### Pattern Problématique #2 : Props/State manquants
```typescript
const handleSubmit = useCallback(() => {
  // Utilise formData, userId
  api.post('/api/save', { ...formData, userId });
}, []); // ❌ formData et userId manquants !

// FIX
const handleSubmit = useCallback(() => {
  api.post('/api/save', { ...formData, userId });
}, [formData, userId]); // ✅ Dépendances complètes
```

### Pattern Acceptable : Setters Stable
```typescript
const [data, setData] = useState([]);

const addItem = useCallback(() => {
  setData(prev => [...prev, newItem]); // ✅ Updater function
}, []); // ✅ OK - setData est stable, pas de stale closure
```

---

## 📋 Méthodologie d'Inspection

### Pour Chaque useCallback:

1. **Lire la fonction complète**
   ```typescript
   const myCallback = useCallback(() => {
     // Quelles variables sont utilisées ?
     // D'où viennent-elles ? (props, state, context)
   }, [/* dependencies */]);
   ```

2. **Lister les accès**
   - Variables state locales
   - Props
   - Context values
   - Autres fonctions/callbacks
   - Constantes (OK d'exclure)

3. **Vérifier updater pattern**
   ```typescript
   setState(prev => ...) // ✅ Pas besoin de state en dépendance
   setState(value) // ❌ Besoin de value en dépendance si utilisé
   ```

4. **Tester la règle**
   - Si variable change et callback devrait changer → Ajouter dépendance
   - Si updater function utilisé → Pas besoin de state en dépendance
   - Si fonction context (addProperty, etc.) → Vérifier stabilité

5. **Décision**
   - ✅ **OK** : Pattern correct, aucun fix nécessaire
   - ⚠️ **WARNING** : Potentiel problème, mais pas critique
   - ❌ **FIX** : Problème réel, dépendances à ajouter

---

## 🎯 Checklist d'Exécution

### Phase 1 : Inspection (NE PAS MODIFIER CODE)
- [ ] Lire CleaningChecklist.tsx - createSession
- [ ] Lire CleaningChecklist.tsx - startSession
- [ ] Lire CleaningChecklist.tsx - pauseSession
- [ ] Lire CleaningChecklist.tsx - resumeSession
- [ ] Lire CleaningChecklist.tsx - completeSession
- [ ] Lire CleaningChecklist.tsx - resetSession
- [ ] Lire CleaningChecklist.tsx - exportToPDF
- [ ] Lire GuestManager.tsx - handleSaveGuest
- [ ] Lire ContractGenerator.tsx - addClause
- [ ] Lire ContractGenerator.tsx - addHouseRule
- [ ] Lire ContractGenerator.tsx - saveAsTemplate
- [ ] Lire GlobalSearch.tsx - handleClear

### Phase 2 : Documentation
- [ ] Créer matrice : Callback | Variables utilisées | Dépendances actuelles | Status
- [ ] Identifier problèmes réels vs patterns acceptables
- [ ] Décision : Corriger ou documenter et ignorer

### Phase 3 : Fixes (Si nécessaire)
- [ ] Appliquer corrections UNIQUEMENT si problème avéré
- [ ] Build validation
- [ ] Test runtime (pas de nouveaux re-renders)

---

## ⚠️ Principes Directeurs

### 1. Ne Pas Over-Optimiser
- ❌ Ajouter toutes les dépendances "au cas où"
- ✅ Comprendre le pattern et corriger si nécessaire

### 2. Préférer Updater Functions
```typescript
// Plutôt que
const add = useCallback(() => {
  setState([...state, item]);
}, [state, item]); // Re-créé à chaque state change

// Utiliser
const add = useCallback(() => {
  setState(prev => [...prev, item]);
}, [item]); // Re-créé seulement si item change
```

### 3. Context Stable
- Les fonctions du context (useBNB) sont stables
- Pas besoin de les ajouter en dépendances (React garantit stabilité)

### 4. Tester Comportement
- Si aucun bug observé = Pattern probablement OK
- Ne pas casser code fonctionnel par "purisme"

---

## 📊 Métriques Attendues

### Si Aucun Fix Nécessaire
- **Code unchanged** : 0 fichiers modifiés
- **Documentation** : Matrice d'analyse créée
- **Confiance** : Patterns validés comme corrects

### Si Fixes Appliqués
- **Fichiers modifiés** : 1-3 max
- **Dépendances ajoutées** : 3-10
- **Build time** : Stable (~20s)
- **Impact** : Réduction re-renders (mesurable avec React DevTools Profiler)

---

## 🔮 Résultat Espéré

### Scénario A : Aucun Problème (Probable)
```
✅ Inspection complète : 12 useCallback analysés
✅ Patterns validés : Tous corrects
✅ Documentation : Matrice de validation
📝 Action : Aucune modification nécessaire
🎯 Conclusion : Code déjà optimisé
```

### Scénario B : Fixes Mineurs (Possible)
```
✅ Inspection complète : 12 useCallback analysés
⚠️ Problèmes détectés : 2-3 stale closures
🔧 Fixes appliqués : Dépendances ajoutées
✅ Build : 0 erreurs, stable
🎯 Conclusion : Optimisations ciblées
```

### Scénario C : Refactoring Nécessaire (Improbable)
```
❌ Problèmes détectés : 5+ hooks incorrects
🔧 Refactoring : Updater functions, dépendances
✅ Build : Validation OK
⚠️ Tests : React DevTools profiling requis
🎯 Conclusion : Amélioration significative
```

---

## 📝 Template Matrice d'Analyse

| Fichier | Callback | Variables Utilisées | Deps Actuelles | Status | Action |
|---------|----------|---------------------|----------------|--------|--------|
| CleaningChecklist | createSession | selectedPropertyId, newSession | `[]` | ? | Inspecter |
| CleaningChecklist | startSession | activeSessionId, sessions | `[]` | ? | Inspecter |
| ... | ... | ... | ... | ... | ... |

**Légende Status:**
- ✅ **OK** : Pattern correct
- ⚠️ **WARN** : Potentiel amélioration
- ❌ **FIX** : Correction requise

---

## 🎓 Apprentissages Attendus

### Règles ESLint React Hooks
```json
{
  "react-hooks/exhaustive-deps": "warn"
}
```
- Vérifier si ESLint configuré
- Si warnings ignorés, les analyser

### Patterns Communs
1. **localStorage callbacks** : Souvent OK avec `[]`
2. **Event handlers simples** : OK avec `[]`
3. **API calls avec params** : Nécessite dépendances
4. **State updaters** : Préférer fonction updater

---

**Status:** 📋 PLAN PRÊT - Phase 1 Inspection commence

**Approche:** PRUDENTE - Analyser avant modifier - Éviter over-optimization
