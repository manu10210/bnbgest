# Audit DB vs Local Storage — 2026-05-02

## Objectif
Identifier les données métier encore stockées côté client et garantir la persistance en base PostgreSQL (Prisma) pour les flux critiques.

---

## Résumé exécutif

### ✅ Déjà en DB (avant + confirmé)
- `properties` via `/api/properties`
- `bookings` via `/api/bookings`
- `guests` via `/api/guests`
- `maintenance` via `/api/maintenance`
- `reviews` via `/api/reviews`

### ✅ Corrigé dans cette passe
1. **BNBContext**: les mutations métier écrivent désormais aussi en DB (pas seulement en localStorage)
   - `add/update/deleteProperty`
   - `add/update/cancelBooking`
   - `add/updateMaintenanceTask`
   - `add/update/deleteInventoryItem`
   - `addReview/respondToReview`
2. **Hydratation DB renforcée** dans `BNBContext`
   - Ajout du chargement DB pour `maintenance`, `inventory`, `reviews` (en plus de `properties/bookings/guests`)
3. **API inventaire complétée**
   - `POST /api/inventory`
   - `PATCH /api/inventory/[id]`
   - `DELETE /api/inventory/[id]`
4. **Bug API maintenance corrigé**
   - `PATCH /api/maintenance/[id]` lisait le body 2 fois (validation + `request.json`) → corrigé en lecture unique + `safeParse`

---

## Cartographie des stockages locaux détectés

## A. Données métier (impact business)
- `contexts/BNBContext.tsx`:
  - `bnbgest_properties`
  - `bnbgest_bookings`
  - `bnbgest_guests`
  - `bnbgest_maintenance`
  - `bnbgest_inventory`
  - `bnbgest_reviews`
  - `bnbgest_bookings_archives`

> Statut après correction: **cache/fallback local** conservé, mais **écriture DB activée** sur les mutations principales.

## B. Données UI / préférences (faible criticité)
- Thème/langue/UX: `bnbgest_theme`, `bnbgest_lang`, recherches récentes, mode expert parser, brouillons wizard, etc.
- Ces données peuvent rester localStorage sans risque métier.

## C. Modules à migrer ensuite (encore majoritairement local)
- `InvoiceEditor` (factures/devis)
- `ContractGenerator`
- `CleaningChecklist` / `CleaningGallery`
- `NotificationCenter` (historique local)
- `ClientShareLink`

> Ces modules nécessitent routes API dédiées + schémas Prisma (si non existants) pour une migration complète.

---

## Fichiers modifiés dans cette passe
- `contexts/BNBContext.tsx`
- `app/api/inventory/route.ts`
- `app/api/inventory/[id]/route.ts` (nouveau)
- `app/api/maintenance/[id]/route.ts`

---

## Risques restants
1. **Stratégie hybride**: local cache + DB (volontaire pour offline/résilience)
2. **Certaines APIs historiques** ne couvrent pas encore tous les objets non critiques
3. **Lint global du repo**: de nombreux problèmes préexistants hors scope (non régressifs)

---

## Prochaines étapes recommandées (phase 2)
1. Migrer `InvoiceEditor` vers DB (`invoices`, `invoice_templates`, `issuer_profile`)
2. Migrer `ContractGenerator` (templates + historique)
3. Migrer `CleaningChecklist/Gallery` (sessions média)
4. Ajouter une tâche de purge contrôlée des anciennes clés localStorage une fois migration validée

---

## Conclusion
La persistance DB est maintenant activée en profondeur sur les **données métier cœur** (biens, réservations, voyageurs, maintenance, inventaire, avis) avec fallback local en cas de mode hors-ligne/non-auth.
