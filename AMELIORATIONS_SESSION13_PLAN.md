# 🎯 Session 13 - Plan d'Amélioration Accessibilité (A11y) Phase 1

**Date** : 8 Avril 2026  
**Focus** : Accessibility - WCAG 2.1 AA Compliance  
**Approche** : Progressive Enhancement

---

## 📊 Contexte

### État Actuel (Post-Sessions 6-12)
- ✅ Type coverage : **95%**
- ✅ UX moderne : **100%** (toast partout)
- ✅ Build time : **20.2s** (-18%)
- ✅ React hooks : **100% optimal**
- ❌ **Accessibilité** : **~15%** (ARIA minimal)

### Opportunité Identifiée
- **1 seul composant** avec ARIA : `ThemeToggle.tsx` (aria-label)
- **0 navigation clavier** explicite (Tab, Enter, Esc)
- **0 rôles ARIA** sur composants interactifs
- **0 annonces screen reader** sur actions dynamiques

---

## 🎯 Objectifs Session 13

### Phase 1 : Composants Interactifs Critiques (Cette Session)

#### 1. **Buttons & Actions** (Priorité 1) ⭐⭐⭐
- Component : `ui/Button.tsx`
- Ajouts :
  - `aria-label` pour icônes seules
  - `aria-disabled` pour disabled state
  - `aria-busy` pour loading state
  - `role="button"` si non-button element

#### 2. **Modals & Dialogs** (Priorité 1) ⭐⭐⭐
- Composants critiques :
  - `BookingManager.tsx` (3 modals : new booking, edit, QR)
  - `GuestManager.tsx` (2 modals : new guest, edit)
  - `MaintenanceManager.tsx` (1 modal : new maintenance)
  - `InventoryManager.tsx` (1 modal : new item)
- Ajouts :
  - `role="dialog"`
  - `aria-modal="true"`
  - `aria-labelledby` (id du titre)
  - `aria-describedby` (id description)
  - **Focus trap** (focus sur 1er input à l'ouverture)
  - **ESC key** (fermeture)

#### 3. **Forms & Inputs** (Priorité 1) ⭐⭐⭐
- Composants :
  - `BookingManager.tsx` (formulaires booking)
  - `GuestManager.tsx` (formulaires guest)
  - Tous les inputs dans modals
- Ajouts :
  - `aria-required` sur champs obligatoires
  - `aria-invalid` + `aria-describedby` pour erreurs
  - Labels explicites (`htmlFor`)
  - Error messages avec IDs uniques

#### 4. **Loading States** (Priorité 2) ⭐⭐
- Pattern global :
  - `aria-live="polite"` pour toasts (déjà via Sonner)
  - `aria-busy="true"` sur containers loading
  - Screen reader text : "Chargement en cours..."

---

## 📁 Fichiers à Modifier (Phase 1)

### Fichiers Critiques
1. **`components/ui/Button.tsx`** (fondation)
   - Ajouter props ARIA : `ariaLabel`, `ariaBusy`, `ariaDisabled`
   - Auto-apply selon `disabled`, `loading` props
   - Lignes estimées : +15

2. **`components/BookingManager.tsx`** (580 lignes)
   - Modal new booking : +8 lignes ARIA
   - Modal edit booking : +8 lignes ARIA
   - Modal QR code : +6 lignes ARIA
   - Formulaire inputs : +12 lignes aria-required/invalid
   - **Total** : +34 lignes

3. **`components/GuestManager.tsx`** (450 lignes)
   - Modal new guest : +8 lignes ARIA
   - Modal edit guest : +8 lignes ARIA
   - Formulaire inputs : +10 lignes
   - **Total** : +26 lignes

4. **`components/MaintenanceManager.tsx`** (350 lignes)
   - Modal new maintenance : +8 lignes ARIA
   - Formulaire inputs : +8 lignes
   - **Total** : +16 lignes

5. **`components/InventoryManager.tsx`** (1500 lignes)
   - Modal new item : +8 lignes ARIA
   - Modal edit item : +8 lignes ARIA
   - Formulaire inputs : +10 lignes
   - **Total** : +26 lignes

### Fichiers Secondaires (Phase 2, future session)
- `ContractGenerator.tsx` (3 modals)
- `CleaningChecklist.tsx` (2 modals)
- `DataExportImportAdvanced.tsx` (1 modal)
- `NotificationCenter.tsx` (panel)
- `GlobalSearch.tsx` (combobox)

---

## 🔧 Patterns à Appliquer

### Pattern 1 : Button avec ARIA
```tsx
// AVANT (Session 12)
<button 
  disabled={isLoading}
  onClick={handleSave}
>
  {isLoading ? <Loader /> : <Save />}
</button>

// APRÈS (Session 13)
<Button
  disabled={isLoading}
  onClick={handleSave}
  aria-label={isLoading ? "Enregistrement en cours" : "Enregistrer"}
  aria-busy={isLoading}
  aria-disabled={isLoading}
>
  {isLoading ? <Loader /> : <Save />}
  <span className="sr-only">Enregistrer la réservation</span>
</Button>
```

### Pattern 2 : Modal avec ARIA
```tsx
// AVANT (Session 12)
{showModal && (
  <div className="fixed inset-0 bg-black/50">
    <div className="bg-white p-6 rounded">
      <h2>Nouvelle Réservation</h2>
      <p>Remplissez les informations</p>
      {/* form */}
    </div>
  </div>
)}

// APRÈS (Session 13)
{showModal && (
  <div 
    className="fixed inset-0 bg-black/50"
    role="dialog"
    aria-modal="true"
    aria-labelledby="booking-modal-title"
    aria-describedby="booking-modal-desc"
  >
    <div className="bg-white p-6 rounded">
      <h2 id="booking-modal-title">Nouvelle Réservation</h2>
      <p id="booking-modal-desc">Remplissez les informations</p>
      {/* form with aria-required, aria-invalid */}
    </div>
  </div>
)}
```

### Pattern 3 : Input avec ARIA
```tsx
// AVANT (Session 12)
<input 
  type="text"
  value={guestName}
  onChange={e => setGuestName(e.target.value)}
/>

// APRÈS (Session 13)
<label htmlFor="guest-name-input" className="block mb-2">
  Nom du voyageur <span className="text-red-500">*</span>
</label>
<input 
  id="guest-name-input"
  type="text"
  value={guestName}
  onChange={e => setGuestName(e.target.value)}
  aria-required="true"
  aria-invalid={!guestName && touched}
  aria-describedby={!guestName && touched ? "guest-name-error" : undefined}
/>
{!guestName && touched && (
  <p id="guest-name-error" className="text-red-500 text-sm mt-1" role="alert">
    Le nom est requis
  </p>
)}
```

### Pattern 4 : Focus Trap Modal (useEffect)
```tsx
// APRÈS (Session 13) - À ajouter dans modals
useEffect(() => {
  if (showModal) {
    // Focus sur 1er input
    const firstInput = document.querySelector<HTMLInputElement>(
      '#booking-modal input:not([disabled])'
    );
    firstInput?.focus();

    // ESC key handler
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowModal(false);
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }
}, [showModal]);
```

---

## ✅ Checklist d'Exécution

### Étape 1 : Foundation (Button.tsx)
- [ ] Ajouter props `ariaLabel?: string` optional
- [ ] Ajouter props `ariaBusy?: boolean` optional
- [ ] Auto-compute aria-disabled depuis `disabled` prop
- [ ] Ajouter `<span className="sr-only">` pour icônes seules
- [ ] Tester avec navigation clavier (Tab, Enter)

### Étape 2 : BookingManager.tsx
- [ ] Modal new booking : role="dialog", aria-modal, aria-labelledby, aria-describedby
- [ ] Modal edit booking : idem
- [ ] Modal QR code : idem
- [ ] Inputs : aria-required sur champs obligatoires (guestName, checkIn, checkOut)
- [ ] Focus trap : useEffect focus sur 1er input
- [ ] ESC key : fermeture modal

### Étape 3 : GuestManager.tsx
- [ ] Modal new guest : role="dialog", aria-modal, aria-labelledby, aria-describedby
- [ ] Modal edit guest : idem
- [ ] Inputs : aria-required sur champs obligatoires (name, email)
- [ ] Focus trap : useEffect focus sur 1er input
- [ ] ESC key : fermeture modal

### Étape 4 : MaintenanceManager.tsx
- [ ] Modal new maintenance : role="dialog", aria-modal, aria-labelledby, aria-describedby
- [ ] Inputs : aria-required sur champs obligatoires (title, description)
- [ ] Focus trap : useEffect focus sur 1er input
- [ ] ESC key : fermeture modal

### Étape 5 : InventoryManager.tsx
- [ ] Modal new item : role="dialog", aria-modal, aria-labelledby, aria-describedby
- [ ] Modal edit item : idem
- [ ] Inputs : aria-required sur champs obligatoires (name, quantity)
- [ ] Focus trap : useEffect focus sur 1er input
- [ ] ESC key : fermeture modal

### Étape 6 : Validation
- [ ] Build : `npm run build` (0 errors)
- [ ] Test navigation clavier : Tab entre inputs, Enter pour submit
- [ ] Test ESC key : fermeture modals
- [ ] Test screen reader (Windows Narrator ou NVDA) : annonces correctes
- [ ] Commit : Documentation + code changes

---

## 📊 Impact Attendu

### Avant Session 13
- Accessibilité : **~15%** (ARIA minimal)
- Keyboard nav : **0%** (focus management absent)
- Screen reader : **Incomplet** (pas d'annonces)

### Après Session 13 (Phase 1)
- Accessibilité : **~50%** (+35%)
- Keyboard nav : **75%** (modals + forms)
- Screen reader : **50%** (annonces modals + errors)
- WCAG 2.1 AA : **Progression vers conformité**

### Fichiers Modifiés
- **5 fichiers** (Button.tsx + 4 composants critiques)
- **~120 lignes ajoutées** (ARIA attributes + focus logic)
- **0 régression** (ajouts seulement, pas de refactor)

---

## 🔮 Phase 2 (Session 14, optionnelle)

### Composants Secondaires
- ContractGenerator.tsx (3 modals)
- CleaningChecklist.tsx (2 modals)
- DataExportImportAdvanced.tsx (1 modal)
- NotificationCenter.tsx (panel)
- GlobalSearch.tsx (combobox avec aria-autocomplete)

### Navigation Globale
- Skip links ("Aller au contenu principal")
- Landmark roles (header, nav, main, aside, footer)
- Breadcrumbs avec aria-current

### Couleurs & Contraste
- Vérifier contraste 4.5:1 minimum (WCAG AA)
- Focus visible (outline)

---

## 🎉 Résultat Attendu Session 13

### Améliorations Concrètes
1. ✅ **Buttons** : Tous avec aria-label pour icônes
2. ✅ **Modals** : 7 modals avec role="dialog" complet
3. ✅ **Forms** : Tous inputs critiques avec aria-required/invalid
4. ✅ **Keyboard** : Tab, Enter, ESC fonctionnels sur modals
5. ✅ **Screen Reader** : Annonces correctes sur modals et erreurs

### Commit Message Prévu
```
♿ Session 13: Accessibility Phase 1 - Modals & Forms ARIA

Foundation:
- Button.tsx: aria-label, aria-busy, aria-disabled props

Modals (7 total):
- BookingManager: 3 modals (new/edit/QR) avec role="dialog"
- GuestManager: 2 modals avec aria-modal
- MaintenanceManager: 1 modal avec aria-labelledby
- InventoryManager: 2 modals avec aria-describedby

Forms:
- aria-required sur champs obligatoires (20+ inputs)
- aria-invalid + aria-describedby pour erreurs
- Focus trap: auto-focus 1er input à ouverture
- ESC key: fermeture modals

Keyboard Nav:
- Tab: navigation entre inputs
- Enter: submit forms
- ESC: fermeture modals

Impact:
- Accessibilité: 15% → 50% (+35%)
- Keyboard nav: 0% → 75%
- Screen reader: Incomplet → 50%
- WCAG 2.1 AA: Progression vers conformité

- Build: 0 errors
- Lignes ajoutées: ~120
- Pattern: Progressive enhancement
```

---

## 📚 Ressources

### Standards
- [WCAG 2.1 AA Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [MDN ARIA](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA)

### Testing Tools
- **Keyboard** : Tab, Shift+Tab, Enter, ESC, Arrow keys
- **Screen Readers** : 
  - Windows : NVDA (gratuit), Narrator (intégré)
  - macOS : VoiceOver (Cmd+F5)
  - Chrome : ChromeVox extension
- **Lighthouse** : Accessibility audit (DevTools)
- **axe DevTools** : Extension Chrome/Firefox

---

**Status** : 📋 Plan prêt  
**Temps estimé** : 45-60 minutes  
**Risque** : ⭐ Très faible (ajouts seulement)  
**Valeur** : ⭐⭐⭐ Très haute (WCAG compliance)  
**Régression** : 0% (progressive enhancement)
