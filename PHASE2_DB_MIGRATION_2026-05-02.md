# Phase 2 — Migration DB des modules localStorage (2026-05-02)

## Objectif
Basculer les modules encore majoritairement localStorage vers une persistance DB avec fallback local.

## Implémentation réalisée

### 1) Nouvelle API de persistance applicative
- Fichier: `app/api/app-state/route.ts`
- Endpoints:
  - `GET /api/app-state?key=...`
  - `PUT /api/app-state`
- Stockage: table `integration_settings` (champ `config` JSON)
- Scope utilisateur: clé namespacée `APP_STATE:{userId}:{key}`
- Sécurité: auth requise + rate limit

### 2) Modules migrés (hydration DB + sync DB debounce + fallback local)
- `components/NotificationCenter.tsx`
  - clé: `notification_center_items`
- `components/CleaningChecklist.tsx`
  - clé: `cleaning_checklist_sessions`
- `components/CleaningGallery.tsx`
  - clé: `cleaning_gallery_sessions`
- `components/ClientShareLink.tsx`
  - clé: `client_share_links`
- `components/ContractGenerator.tsx`
  - clés:
    - `contract_generator_config`
    - `contract_generator_templates`
    - `contract_generator_history`
- `components/InvoiceEditor.tsx`
  - clés:
    - `invoice_editor_invoices`
    - `invoice_editor_templates`
    - `invoice_editor_issuer_profile`

## Comportement retenu
- Lecture initiale: localStorage immédiat (UX rapide), puis hydratation DB.
- Écriture: localStorage conservé + sync DB asynchrone (debounce).
- En cas d’échec réseau/auth: mode local intact (pas de blocage UI).

## Validation
- Diagnostics TypeScript/éditeur sur fichiers modifiés: OK.
- Lint ciblé: échec principalement dû à des erreurs préexistantes hors scope (imports inutilisés, `any`, `react/no-unescaped-entities` dans ces composants volumineux).

## Suite recommandée
- Optionnel: remplacer la persistance `InvoiceEditor` JSON par des routes CRUD natives `Invoice`/`InvoiceLine` (modèles Prisma déjà présents) pour requêtabilité métier avancée.
