# 🎯 Session 15 - Accessibilité 90% (Phase 3 Finale)

**Date**: 8 Avril 2026  
**Objectif**: Atteindre 90% de conformité WCAG 2.1 AA en ajoutant ARIA + focus management aux 3 derniers composants avec modals

---

## 📊 Contexte

### État Actuel (Post-Session 14)
- ✅ Accessibilité: **75%** (WCAG 2.1 AA partielle)
- ✅ BookingManager: 2 modals accessibles (QR, Details)
- ✅ GuestManager: 2 modals accessibles (New, Edit)
- ✅ Focus management: 100% sur 4 modals
- ✅ ESC key: 100% sur 4 modals
- ✅ Forms ARIA: 100% sur inputs critiques

### Objectif Session 15
- 🎯 Accessibilité: **75% → 90%** (+15%)
- 🎯 Ajouter ARIA + focus sur 3 composants restants
- 🎯 Total modals accessibles: 4 → 10 (+6)
- 🎯 Conformité WCAG 2.1 AA: Proche 100%

---

## 🎯 Composants Cibles

### 1. MaintenanceManager.tsx
**Modals identifiés**: 1 modal (New/Edit maintenance)

**Travail requis**:
- [ ] ARIA sur modal overlay (role="dialog", aria-modal, aria-labelledby, aria-describedby)
- [ ] ARIA sur formulaire (htmlFor, id, aria-required sur champs obligatoires)
- [ ] useEffect focus management (150ms delay)
- [ ] ESC key handler

**Estimation**: 30-35 lignes de code  
**Temps**: ~20 minutes

---

### 2. InventoryManager.tsx
**Modals identifiés**: 2 modals (New/Edit equipment, Details modal)

**Travail requis**:
- [ ] ARIA sur modal New/Edit equipment
- [ ] ARIA sur modal Details (si présent)
- [ ] htmlFor + id sur tous inputs
- [ ] aria-required sur champs obligatoires (nom, catégorie)
- [ ] aria-invalid + aria-describedby sur erreurs
- [ ] useEffect focus management (150ms delay)
- [ ] ESC key handler

**Estimation**: 60-70 lignes de code  
**Temps**: ~25 minutes

---

### 3. ContractGenerator.tsx
**Modals identifiés**: 3 modals (Preview, Template selection, Settings)

**Travail requis**:
- [ ] ARIA sur modal Preview (role="dialog", aria-modal, aria-labelledby)
- [ ] ARIA sur modal Template selection
- [ ] ARIA sur modal Settings (si formulaire)
- [ ] htmlFor + id sur inputs de formulaire
- [ ] aria-required sur champs obligatoires
- [ ] useEffect focus management (150ms delay)
- [ ] ESC key handler (3 modals)

**Estimation**: 90-100 lignes de code  
**Temps**: ~30 minutes

---

## 🔧 Pattern Réutilisable (Établi Sessions 13-14)

### Pattern 1: Focus Management Modal (useEffect)
```tsx
useEffect(() => {
  if (showModal) {
    const timer = setTimeout(() => {
      const modalSelector = `[aria-labelledby$="-modal-title"]`;
      const firstButton = document.querySelector<HTMLButtonElement>(
        `${modalSelector} button:not([disabled])`
      );
      const firstInput = document.querySelector<HTMLInputElement>(
        `${modalSelector} input:not([disabled])`
      );
      // Action modals: button > input
      // Form modals: input > button
      (firstButton || firstInput)?.focus();
    }, 150);
    
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowModal(null);
    };
    document.addEventListener('keydown', handleEsc);
    
    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', handleEsc);
    };
  }
}, [showModal]);
```

### Pattern 2: Modal ARIA Complete
```tsx
<motion.div
  role="dialog"
  aria-modal="true"
  aria-labelledby="modal-title"
  aria-describedby="modal-desc"
  className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
  onClick={() => setShowModal(null)}
>
  <div onClick={(e) => e.stopPropagation()}>
    <h3 id="modal-title">Titre du modal</h3>
    <button aria-label="Fermer le modal"><X /></button>
    <div id="modal-desc">
      {/* Contenu du modal */}
    </div>
  </div>
</motion.div>
```

### Pattern 3: Form Input ARIA
```tsx
<label htmlFor="input-id">
  Nom du champ <span className="text-red-500">*</span>
</label>
<input
  id="input-id"
  aria-required="true"
  aria-invalid={!!errors.field}
  aria-describedby={errors.field ? "input-id-error" : undefined}
/>
{errors.field && (
  <p id="input-id-error" role="alert" className="text-red-500 text-sm">
    {errors.field}
  </p>
)}
```

---

## 📋 Checklist d'Exécution

### Phase 1: MaintenanceManager (20 min)
1. [ ] Grep search pour localiser le modal
2. [ ] Read component pour comprendre la structure
3. [ ] Ajouter ARIA sur modal overlay + titre + bouton close
4. [ ] Ajouter htmlFor + id sur inputs de formulaire
5. [ ] Ajouter aria-required sur champs obligatoires
6. [ ] Ajouter useEffect focus management après useState
7. [ ] Validation: grep search pour confirmer les changements

### Phase 2: InventoryManager (25 min)
1. [ ] Grep search pour localiser les 2 modals
2. [ ] Read component pour structure des modals
3. [ ] Ajouter ARIA sur modal New/Edit
4. [ ] Ajouter ARIA sur modal Details (si présent)
5. [ ] htmlFor + id sur tous inputs
6. [ ] aria-required sur nom, catégorie
7. [ ] aria-invalid + aria-describedby sur erreurs
8. [ ] Ajouter useEffect focus management
9. [ ] Validation: grep search pour confirmer

### Phase 3: ContractGenerator (30 min)
1. [ ] Grep search pour localiser les 3 modals
2. [ ] Read component pour structure complexe
3. [ ] Ajouter ARIA sur modal Preview
4. [ ] Ajouter ARIA sur modal Template selection
5. [ ] Ajouter ARIA sur modal Settings
6. [ ] htmlFor + id sur inputs si formulaires
7. [ ] Ajouter useEffect focus management (3 modals)
8. [ ] ESC key handler avec logique pour 3 modals
9. [ ] Validation: grep search pour confirmer

### Phase 4: Build & Documentation (20 min)
1. [ ] npm run build (validation TypeScript + compilation)
2. [ ] Vérifier 0 erreurs, temps de build
3. [ ] Créer AMELIORATIONS_SESSION15_COMPLETE.md
4. [ ] Git commit avec message détaillé
5. [ ] Git push vers main

---

## 📊 Métriques Attendues

### Avant (Session 14)
- Accessibilité: **75%**
- Modals accessibles: 4/10 (BookingManager 2, GuestManager 2)
- Focus management: 100% sur 4 modals
- ESC key: 100% sur 4 modals
- Forms ARIA: 100% sur inputs critiques (GuestManager)
- Build: 14.4s, 0 errors

### Après (Session 15)
- Accessibilité: **90%** (+15%)
- Modals accessibles: 10/10 (+6) - **100% des modals critiques**
- Focus management: 100% sur 10 modals
- ESC key: 100% sur 10 modals
- Forms ARIA: 100% sur tous inputs obligatoires
- Build: ~14-15s (cible: <20s)
- Lignes ajoutées: ~180-200 lignes
- Régressions: **0** (maintenir qualité)

---

## 🎯 Impact Cumulatif Sessions 13-15

| Métrique | Session 12 | Session 13 | Session 14 | Session 15 (cible) |
|----------|------------|------------|------------|-------------------|
| **Accessibilité** | 15% | 50% (+35%) | 75% (+25%) | **90% (+15%)** |
| **Modals ARIA** | 0 | 2 | 4 | **10** |
| **Focus mgmt** | 0% | 0% | 100% | **100%** |
| **ESC key** | 0% | 0% | 100% | **100%** |
| **Forms ARIA** | 0% | 0% | 50% | **100%** |
| **Build time** | 14.4s | 14.4s | 14.4s | ~14-15s |
| **Type coverage** | 95% | 95% | 95% | 95% |
| **Patterns** | 6 | 8 | 9 | **10** |

---

## ✅ Validation Finale

### Tests Manuels
- [ ] MaintenanceManager: Ouvrir modal → Focus auto → ESC ferme
- [ ] InventoryManager: Ouvrir modal New → Focus input → TAB navigation → ESC ferme
- [ ] InventoryManager: Ouvrir modal Details (si présent) → Focus auto → ESC ferme
- [ ] ContractGenerator: Ouvrir Preview → Focus auto → ESC ferme
- [ ] ContractGenerator: Ouvrir Template selection → Focus auto → ESC ferme
- [ ] ContractGenerator: Ouvrir Settings → Focus auto → ESC ferme

### Tests Accessibilité
- [ ] Screen reader: NVDA/Narrator annonce correctement les modals
- [ ] Keyboard only: Navigation complète sans souris
- [ ] Focus visible: Outline visible sur éléments focusés
- [ ] ARIA: Pas d'erreurs dans axe DevTools

### Build Validation
- [ ] `npm run build`: 0 erreurs TypeScript
- [ ] Build time: <20s (cible maintenue)
- [ ] Warnings: Uniquement non-bloquants
- [ ] Production: Deployment Vercel sans erreurs

---

## 🚀 Prochaines Étapes (Post-Session 15)

### Option 1: Accessibilité 100% (Recommandé si temps)
- Navigation landmarks (header, main, nav, aside, footer)
- Skip links ("Aller au contenu principal")
- Breadcrumbs avec aria-current="page"
- **Temps**: 2-3h

### Option 2: Tests E2E avec Playwright
- Setup Playwright
- Tests des flux critiques (booking, guest, maintenance)
- CI/CD integration
- **Temps**: 4-6h

### Option 3: Performance Monitoring
- Bundle analyzer (@next/bundle-analyzer)
- Performance budgets (webpack config)
- Lighthouse CI
- **Temps**: 2-3h

---

## 📝 Notes Techniques

### Adaptation du Pattern Focus Management

**Maintenance (1 modal)**:
- useState: `showModal` (boolean simple)
- Focus: Input prioritaire (formulaire)
- ESC: Simple setShowModal(false)

**Inventory (2 modals)**:
- useState: `showModal` (string: 'new' | 'edit' | 'details' | null)
- Focus: Input prioritaire pour new/edit, button pour details
- ESC: setShowModal(null)

**ContractGenerator (3 modals)**:
- useState: `showModal` (string: 'preview' | 'template' | 'settings' | null)
- Focus: Button prioritaire pour preview/template, input pour settings
- ESC: setShowModal(null) (gère les 3 automatiquement)

### Timing

**150ms delay**: Framer Motion animation completion  
**Cleanup**: removeEventListener automatique via return  
**querySelector**: `[aria-labelledby$="-modal-title"]` fonctionne pour tous les modals

---

**Session 15 prête à démarrer ! 🚀**
