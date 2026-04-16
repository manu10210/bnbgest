# AMÉLIORATIONS SESSION 26 — CLASSIFICATION VERSIONNÉE + TRACES

## Objectif de session
Rendre le moteur de classification des emails Airbnb explicite, versionné et traçable pour faciliter le debug et améliorer la fiabilité en production.

## Implémentation réalisée

### 1) Moteur de classification versionné
- Ajout de la version moteur: `PARSER_PATTERN_VERSION = '2026.2'`.
- Ajout d'une priorité formelle des règles sujet:
  - `new` -> `cancelled` -> `modified` -> `checkout` -> `reminder` -> `review` -> `payout`.

### 2) Hiérarchie explicite de fallback
- Étape 1: classification depuis le `subject` via `matchSubjectClassification(...)`.
- Étape 2: fallback `body` via `matchBodyFallbackClassification(...)`.
- Si aucun match: email ignoré (`return null`).

### 3) Journalisation technique (trace) dans les données parsées
Nouveaux champs optionnels ajoutés à `ParsedBooking`:
- `parserPatternVersion`
- `classificationSource` (`subject` | `body-fallback`)
- `classificationRuleId`
- `classificationRegex`

Ces champs permettent d'expliquer précisément **pourquoi** un email a été classé dans un type donné.

## Fichiers modifiés
- `lib/gmail-parser.ts`
  - Ajout du moteur versionné.
  - Ajout des helpers de matching sujet/body.
  - Refactor du bloc de décision `bookingType`.
  - Injection des métadonnées de classification dans le payload final.

## Validation
- TypeScript: `npx tsc --noEmit --skipLibCheck` ✅ (`Exit: 0`)

## Valeur apportée
- Debug ultra rapide des faux positifs/faux négatifs.
- Meilleure auditabilité des décisions parser.
- Base solide pour Session 27 (précision financière avancée).
