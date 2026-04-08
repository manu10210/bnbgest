# 🎯 Session 14 - Plan d'Amélioration Focus Management & Keyboard Nav

**Date** : 8 Avril 2026  
**Focus** : Focus Management + Keyboard Navigation (ESC key)  
**Approche** : Progressive Enhancement (Suite Session 13)

---

## 📊 Contexte

### État Actuel (Post-Session 13)
- ✅ Type coverage : **95%**
- ✅ UX moderne : **100%** (toast partout)
- ✅ Build time : **18.3s** (-26% vs Session 6)
- ✅ React hooks : **100% optimal**
- ✅ **Accessibilité** : **50%** (+35% Session 13)
- ✅ ARIA attributes : 2 modals (BookingManager QR + Details)
- ❌ **Focus management** : Absent (modals)
- ❌ **ESC key** : Non implémenté
- ❌ **Auto-focus** : Non implémenté

---

## 🎯 Objectifs Session 14

### Phase A : Focus Management (Modals BookingManager)

#### 1. **Auto-Focus Premier Input** ⭐⭐⭐
- Modal ouvre → Focus automatique sur 1er élément interactif
- Pattern : `useEffect` + `querySelector` + `focus()`
- Modals cibles : QR (bouton télécharger), Details (bouton facture)

#### 2. **ESC Key Handler** ⭐⭐⭐
- ESC key → Fermeture modal
- Pattern : `useEffect` + `addEventListener('keydown')`
- Cleanup : `removeEventListener` au unmount

#### 3. **Focus Return** ⭐⭐
- Modal ferme → Focus retourne à l'élément déclencheur
- Pattern : Stocker `document.activeElement` avant ouverture

---

### Phase B : Nouveaux Modals ARIA (GuestManager)

#### 4. **GuestManager.tsx - 2 Modals** ⭐⭐⭐
- Modal new guest : role="dialog" + ARIA complet
- Modal edit guest : role="dialog" + ARIA complet
- Focus management : Auto-focus + ESC key
- Forms : aria-required sur champs obligatoires

---

### Phase C : Nouveaux Modals ARIA (MaintenanceManager)

#### 5. **MaintenanceManager.tsx - 1 Modal** ⭐⭐
- Modal new maintenance : role="dialog" + ARIA complet
- Focus management : Auto-focus + ESC key
- Forms : aria-required

---

## 🔧 Patterns à Appliquer

### Pattern 1 : Focus Management Complet

```tsx
// Hook personnalisé (optionnel)
function useModalFocus(isOpen: boolean) {
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      // 1. Sauvegarder focus actuel
      previousFocusRef.current = document.activeElement as HTMLElement;

      // 2. Auto-focus premier input/bouton dans modal
      setTimeout(() => {
        const firstFocusable = document.querySelector<HTMLElement>(
          'dialog [role="dialog"] button:not([disabled]), ' +
          'dialog [role="dialog"] input:not([disabled]), ' +
          'dialog [role="dialog"] select:not([disabled])'
        );
        firstFocusable?.focus();
      }, 100); // Délai pour animation modal

      // 3. ESC key handler
      const handleEsc = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setIsOpen(false);
        }
      };
      document.addEventListener('keydown', handleEsc);

      return () => {
        document.removeEventListener('keydown', handleEsc);
        // 4. Restaurer focus à la fermeture
        previousFocusRef.current?.focus();
      };
    }
  }, [isOpen]);
}
```

### Pattern 2 : ESC Key Simple (Inline)

```tsx
// Dans BookingManager.tsx
useEffect(() => {
  if (showModal) {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowModal(null);
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }
}, [showModal]);
```

### Pattern 3 : Auto-Focus Simple

```tsx
useEffect(() => {
  if (showModal === 'qr') {
    // Délai pour attendre animation Framer Motion
    const timer = setTimeout(() => {
      const firstButton = document.querySelector<HTMLButtonElement>(
        '[aria-labelledby="qr-modal-title"] button:not([disabled])'
      );
      firstButton?.focus();
    }, 150);
    return () => clearTimeout(timer);
  }
}, [showModal]);
```

---

## ✅ Checklist d'Exécution

### Étape 1 : BookingManager.tsx - Focus Management

- [ ] ESC key handler : Fermeture modal 'qr' et 'details'
- [ ] Auto-focus modal QR : Focus sur bouton "Télécharger"
- [ ] Auto-focus modal Details : Focus sur bouton "Facture"
- [ ] Test : ESC ferme modal
- [ ] Test : Focus automatique à l'ouverture

### Étape 2 : GuestManager.tsx - ARIA Complet

- [ ] Trouver les 2 modals (new guest, edit guest)
- [ ] Modal new guest : role="dialog", aria-modal, aria-labelledby, aria-describedby
- [ ] Modal edit guest : idem
- [ ] Buttons : aria-label sur boutons icônes
- [ ] Inputs : aria-required sur name, email
- [ ] Focus management : Auto-focus + ESC key
- [ ] Test navigation clavier

### Étape 3 : MaintenanceManager.tsx - ARIA Complet

- [ ] Trouver le modal new maintenance
- [ ] Modal : role="dialog", aria-modal, aria-labelledby, aria-describedby
- [ ] Buttons : aria-label
- [ ] Inputs : aria-required sur title, description
- [ ] Focus management : Auto-focus + ESC key
- [ ] Test navigation clavier

### Étape 4 : Validation Globale

- [ ] Build : `npm run build` (0 errors)
- [ ] Test ESC : Fermeture tous les modals
- [ ] Test auto-focus : Ouverture modals
- [ ] Test Tab : Navigation entre éléments
- [ ] Commit : Documentation + code

---

## 📊 Impact Attendu

### Avant Session 14
- Accessibilité : **50%** (ARIA modals seulement)
- Focus management : **0%** (aucun modal)
- ESC key : **0%**
- Auto-focus : **0%**
- Modals accessibles : **2** (BookingManager QR + Details)

### Après Session 14
- Accessibilité : **75%** (+25%) ⭐
- Focus management : **100%** (5 modals)
- ESC key : **100%** (tous modals)
- Auto-focus : **100%** (tous modals)
- Modals accessibles : **5** (BookingManager 2 + GuestManager 2 + MaintenanceManager 1)

### Fichiers Modifiés
- **3 fichiers** (BookingManager, GuestManager, MaintenanceManager)
- **~80 lignes ajoutées** (Focus logic + ARIA + ESC handlers)
- **0 régression** (progressive enhancement)

---

## 🎉 Résultat Attendu Session 14

### Améliorations Concrètes
1. ✅ **ESC key** : Tous les modals fermables avec ESC
2. ✅ **Auto-focus** : Focus automatique à l'ouverture
3. ✅ **3 nouveaux modals ARIA** : GuestManager (2) + MaintenanceManager (1)
4. ✅ **Keyboard navigation** : Tab, Enter, ESC fonctionnels
5. ✅ **WCAG 2.1 AA** : Progression significative vers conformité

### Commit Message Prévu
```
♿ Session 14: Focus Management + Keyboard Nav - 3 Nouveaux Modals

Focus Management (5 modals):
- BookingManager: ESC key + auto-focus (QR, Details)
- GuestManager: 2 modals ARIA + ESC + auto-focus
- MaintenanceManager: 1 modal ARIA + ESC + auto-focus

Keyboard Navigation:
- ESC key: Fermeture tous modals
- Auto-focus: Focus automatique à ouverture
- Tab: Navigation optimisée

ARIA (3 nouveaux modals):
- GuestManager new: role="dialog", aria-modal, aria-labelledby
- GuestManager edit: idem + aria-required inputs
- MaintenanceManager new: idem + aria-required

Impact:
- Accessibilité: 50% → 75% (+25%)
- Focus management: 0% → 100%
- ESC key: 0% → 100%
- Modals accessibles: 2 → 5 (+3)
- WCAG 2.1 AA: Proche conformité

- Build: 0 errors
- Lignes ajoutées: ~80
- Pattern: useEffect focus + ESC handlers
```

---

**Status** : 📋 Plan prêt  
**Temps estimé** : 30-45 minutes  
**Risque** : ⭐ Très faible (pattern éprouvé)  
**Valeur** : ⭐⭐⭐ Très haute (WCAG compliance)  
**Régression** : 0% (progressive enhancement)
