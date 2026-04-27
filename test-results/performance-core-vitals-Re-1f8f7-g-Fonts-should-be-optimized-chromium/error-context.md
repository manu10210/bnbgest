# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: performance\core-vitals.spec.ts >> Resource Loading >> Fonts should be optimized
- Location: tests\performance\core-vitals.spec.ts:196:7

# Error details

```
TimeoutError: page.goto: Timeout 15000ms exceeded.
Call log:
  - navigating to "http://localhost:3000/", waiting until "load"

```

```
Tearing down "context" exceeded the test timeout of 30000ms.
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - link "Aller au contenu principal" [ref=e2] [cursor=pointer]:
    - /url: "#main-content"
  - generic [ref=e3]:
    - generic [ref=e4]:
      - banner [ref=e5]:
        - generic [ref=e7]:
          - generic [ref=e8] [cursor=pointer]:
            - img [ref=e10]
            - generic [ref=e14]: bnbgest
          - generic [ref=e15]:
            - button "Passer en mode clair" [ref=e16]:
              - generic:
                - img
                - img
              - img [ref=e18]
            - button "Connexion" [ref=e20]
      - main [ref=e21]:
        - generic [ref=e22]:
          - generic [ref=e24]:
            - generic [ref=e25]:
              - generic [ref=e26]:
                - img [ref=e27]
                - text: Plateforme de gestion locative tout-en-un
              - heading "Gérez votre location comme un hôte pro" [level=1] [ref=e30]:
                - text: Gérez votre location
                - text: comme un hôte pro
              - paragraph [ref=e31]: Réservations, calendrier, tarification dynamique, contrats et bien plus. Tout dans un seul outil élégant.
              - generic [ref=e32]:
                - button "Commencer gratuitement" [ref=e33]:
                  - img [ref=e34]
                  - text: Commencer gratuitement
                  - img [ref=e39]
                - button "Découvrir la plateforme" [ref=e41]:
                  - img [ref=e42]
                  - text: Découvrir la plateforme
            - generic [ref=e46]:
              - img [ref=e48]
              - generic [ref=e50]:
                - paragraph [ref=e51]: +23%
                - paragraph [ref=e52]: de revenus
            - generic [ref=e55]:
              - img [ref=e57]
              - generic [ref=e59]:
                - paragraph [ref=e60]: 4.9/5
                - paragraph [ref=e61]: satisfaction
            - generic [ref=e64]:
              - img [ref=e66]
              - generic [ref=e68]:
                - paragraph [ref=e69]: 5min
                - paragraph [ref=e70]: mise en place
          - generic [ref=e72]:
            - generic [ref=e73]:
              - generic [ref=e74]:
                - img [ref=e75]
                - text: Fonctionnalités
              - heading "Tout ce dont vous avez besoin" [level=2] [ref=e79]
              - paragraph [ref=e80]: Une suite complète d'outils pour gérer votre activité comme un professionnel
            - generic [ref=e81]:
              - generic [ref=e82]:
                - img [ref=e84]
                - paragraph [ref=e86]: Réservations
                - paragraph [ref=e87]: Gestion complète
              - generic [ref=e88]:
                - img [ref=e90]
                - paragraph [ref=e93]: Tarification
                - paragraph [ref=e94]: Prix dynamiques
              - generic [ref=e95]:
                - img [ref=e97]
                - paragraph [ref=e99]: Maintenance
                - paragraph [ref=e100]: Suivi en temps réel
              - generic [ref=e101]:
                - img [ref=e103]
                - paragraph [ref=e107]: Inventaire
                - paragraph [ref=e108]: Stock automatisé
              - generic [ref=e109]:
                - img [ref=e111]
                - paragraph [ref=e113]: Finances
                - paragraph [ref=e114]: Rapports détaillés
              - generic [ref=e115]:
                - img [ref=e117]
                - paragraph [ref=e120]: Guide accueil
                - paragraph [ref=e121]: Multi-langues
              - generic [ref=e122]:
                - img [ref=e124]
                - paragraph [ref=e126]: Avis clients
                - paragraph [ref=e127]: Réputation
              - generic [ref=e128]:
                - img [ref=e130]
                - paragraph [ref=e132]: Contrats
                - paragraph [ref=e133]: Génération auto
            - generic [ref=e135]:
              - generic [ref=e136]:
                - img [ref=e138]
                - generic [ref=e140]: Données sécurisées
              - generic [ref=e141]:
                - img [ref=e143]
                - generic [ref=e145]: Ultra rapide
              - generic [ref=e146]:
                - img [ref=e148]
                - generic [ref=e150]: Design premium
              - generic [ref=e151]:
                - img [ref=e153]
                - generic [ref=e156]: 30+ outils intégrés
              - generic [ref=e157]:
                - img [ref=e159]
                - generic [ref=e164]: Mis à jour en continu
          - generic [ref=e166]:
            - img [ref=e168]
            - heading "Prêt à transformer votre activité ?" [level=2] [ref=e173]
            - paragraph [ref=e174]: Rejoignez les hôtes qui utilisent BNBGest pour simplifier leur gestion au quotidien.
            - button "Démarrer maintenant" [ref=e175]:
              - text: Démarrer maintenant
              - img [ref=e176]
      - contentinfo [ref=e178]:
        - generic [ref=e179]:
          - generic [ref=e180]:
            - img [ref=e182]
            - generic [ref=e185]: © 2026 BNBGest
            - generic [ref=e186]: ·
            - generic [ref=e187]: Gestion locative professionnelle
          - generic [ref=e188]:
            - img [ref=e189]
            - generic [ref=e192]: Français (FR)
    - region "Notifications alt+T"
  - button "Open Next.js Dev Tools" [ref=e198] [cursor=pointer]:
    - img [ref=e199]
  - alert [ref=e202]
```