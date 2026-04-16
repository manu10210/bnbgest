# AMÉLIORATIONS SESSION 25 — SCRAPPER EMAIL AIRBNB (MODE EXPERT)

## Objectif
Construire un scrapper Gmail Airbnb **sans API tierce** qui récupère, classe et exploite un maximum d’informations de façon fiable dans l’applicatif BNBGEST.

## Contraintes / contrat technique
- Source unique: emails Gmail Airbnb.
- Tolérance zéro sur l’encodage (UTF-8 propre, pas de mojibake).
- Priorité qualité: mieux rejeter un email douteux que polluer les données.
- Compatibilité FR/EN et variations de templates Airbnb.
- Fonctionnement en itérations courtes (multi-sessions), avec validation TypeScript à chaque session.

## Plan multi-sessions

### Session 25 (cette session) — Enrichissement voyageur + structuration stricte
- [x] Ajouter la composition voyageurs: adultes / enfants / bébés / animaux.
- [x] Remonter ces champs depuis le parser vers l’importeur.
- [x] Enrichir les notes importées dans les bookings (langue, pays, listingId, composition voyageurs).
- [x] Garder le filtrage qualité strict déjà en place (2026 + validité des données).

### Session 26 — Moteur d’extraction “patterns versionnés”
- [ ] Isoler les patterns critiques dans des blocs versionnés (new/cancelled/modified/review/payout).
- [ ] Ajouter un mécanisme de fallback hiérarchique explicite (subject > body > json-ld > heuristique).
- [ ] Journaliser les raisons de classification (debug/traces).

### Session 27 — Précision financière avancée
- [ ] Renforcer extraction de: nightly rate, cleaning fee, service fee, taxes, host payout.
- [ ] Gérer plus de formats monétaires (espaces insécables, séparateurs locaux, symboles mixtes).
- [ ] Réconcilier montant total vs hostPayout selon le type d’email.

### Session 28 — Consolidation inter-emails (thread/réservation)
- [ ] Fusionner plus finement les emails d’une même réservation (timeline: new -> modified -> checkout -> review -> payout).
- [ ] Règles de priorité par champ (source la plus fiable gagne).
- [ ] Détection/résolution des conflits de données.

### Session 29 — QA finale “production hardening”
- [ ] Jeu de tests parser (cas réels anonymisés FR/EN + edge cases).
- [ ] Mesures de couverture extraction par type d’email.
- [ ] Tableau de bord de qualité (emails acceptés/rejetés + raisons).

## Critères de succès finaux
- ≥ 95% d’emails Airbnb exploitables classés correctement.
- Données importées cohérentes et actionnables (booking/guest/finance/review/payout).
- Pas de régression TypeScript/build.
- Processus reproductible session par session.
