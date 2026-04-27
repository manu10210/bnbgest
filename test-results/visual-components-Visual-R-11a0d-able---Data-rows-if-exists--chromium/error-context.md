# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: visual\components.spec.ts >> Visual Regression - Components >> Table - Data rows (if exists)
- Location: tests\visual\components.spec.ts:125:7

# Error details

```
TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
Call log:
  - waiting for locator('#email') to be visible

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
    - generic [ref=e5]:
      - generic [ref=e6]:
        - button "Retour" [ref=e7]:
          - img [ref=e8]
          - text: Retour
        - button "Passer en mode clair" [ref=e10]:
          - generic:
            - img
            - img
          - img [ref=e12]
      - generic [ref=e14]:
        - generic [ref=e16]: BG
        - heading "Bon retour !" [level=2] [ref=e17]
        - paragraph [ref=e18]: Accédez à votre espace administrateur
      - generic [ref=e19]:
        - button "Connexion" [ref=e20]:
          - generic [ref=e21]:
            - img [ref=e22]
            - text: Connexion
        - button "Inscription" [ref=e25]:
          - generic [ref=e26]:
            - img [ref=e27]
            - text: Inscription
      - generic [ref=e30]:
        - generic [ref=e31]:
          - generic [ref=e32]:
            - generic [ref=e33]: Email
            - generic [ref=e34]:
              - img [ref=e36]
              - textbox "Email" [ref=e39]:
                - /placeholder: votre@email.com
          - generic [ref=e40]:
            - generic [ref=e41]: Mot de passe
            - generic [ref=e42]:
              - img [ref=e44]
              - textbox "Mot de passe" [ref=e47]:
                - /placeholder: Votre mot de passe
              - button [ref=e48]:
                - img [ref=e49]
          - link "Mot de passe oublié ?" [ref=e53] [cursor=pointer]:
            - /url: /forgot-password
          - button "Se connecter" [ref=e54]:
            - img [ref=e55]
            - text: Se connecter
          - generic [ref=e62]: OU
          - button "Continuer avec Google" [ref=e63]:
            - img [ref=e64]
            - text: Continuer avec Google
        - generic [ref=e69]:
          - generic [ref=e70]:
            - img [ref=e71]
            - heading "Comptes de test" [level=4] [ref=e74]
          - generic [ref=e75]:
            - generic [ref=e76]:
              - generic [ref=e77]: A
              - generic [ref=e78]:
                - strong [ref=e79]: claustre.emmanuel@gmail.com
                - text: — Admin
            - generic [ref=e80]:
              - generic [ref=e81]: E
              - generic [ref=e82]:
                - strong [ref=e83]: employee@bnbgest.com
                - text: — Employé
      - generic [ref=e84]:
        - generic [ref=e85]:
          - img [ref=e86]
          - generic [ref=e88]: Sécurisé
        - generic [ref=e89]:
          - img [ref=e90]
          - generic [ref=e92]: Rapide
        - generic [ref=e93]:
          - img [ref=e94]
          - generic [ref=e97]: Premium
      - paragraph [ref=e98]: © 2026 BNBGest · Gestion locative professionnelle
    - region "Notifications alt+T"
  - button "Open Next.js Dev Tools" [ref=e104] [cursor=pointer]:
    - img [ref=e105]
  - alert [ref=e108]
```