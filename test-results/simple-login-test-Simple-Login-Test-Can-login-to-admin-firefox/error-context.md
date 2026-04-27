# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: simple-login-test.spec.ts >> Simple Login Test >> Can login to admin
- Location: tests\simple-login-test.spec.ts:4:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.waitForURL: Test timeout of 30000ms exceeded.
=========================== logs ===========================
waiting for navigation to "**/admin**" until "load"
============================================================
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
        - button "Passer en mode clair" [ref=e11]:
          - generic:
            - img
            - img
          - img [ref=e13]
      - generic [ref=e15]:
        - generic [ref=e17]: BG
        - heading "Bon retour !" [level=2] [ref=e18]
        - paragraph [ref=e19]: Accédez à votre espace administrateur
      - generic [ref=e20]:
        - button "Connexion" [ref=e21]:
          - generic [ref=e22]:
            - img [ref=e23]
            - text: Connexion
        - button "Inscription" [ref=e27]:
          - generic [ref=e28]:
            - img [ref=e29]
            - text: Inscription
      - generic [ref=e34]:
        - generic [ref=e35]:
          - generic [ref=e36]:
            - generic [ref=e37]: Email
            - generic [ref=e38]:
              - img [ref=e40]
              - textbox "Email" [ref=e43]:
                - /placeholder: votre@email.com
                - text: demo@bnbgest.com
          - generic [ref=e44]:
            - generic [ref=e45]: Mot de passe
            - generic [ref=e46]:
              - img [ref=e48]
              - textbox "Mot de passe" [ref=e51]:
                - /placeholder: Votre mot de passe
                - text: Demo1234!
              - button [ref=e52]:
                - img [ref=e53]
          - link "Mot de passe oublié ?" [ref=e57] [cursor=pointer]:
            - /url: /forgot-password
          - button "Se connecter" [ref=e58]:
            - img [ref=e59]
            - text: Se connecter
          - generic [ref=e67]: OU
          - button "Continuer avec Google" [ref=e68]:
            - img [ref=e69]
            - text: Continuer avec Google
        - generic [ref=e74]:
          - generic [ref=e75]:
            - img [ref=e76]
            - heading "Comptes de test" [level=4] [ref=e81]
          - generic [ref=e82]:
            - generic [ref=e83]:
              - generic [ref=e84]: A
              - generic [ref=e85]:
                - strong [ref=e86]: claustre.emmanuel@gmail.com
                - text: — Admin
            - generic [ref=e87]:
              - generic [ref=e88]: E
              - generic [ref=e89]:
                - strong [ref=e90]: employee@bnbgest.com
                - text: — Employé
      - generic [ref=e91]:
        - generic [ref=e92]:
          - img [ref=e93]
          - generic [ref=e95]: Sécurisé
        - generic [ref=e96]:
          - img [ref=e97]
          - generic [ref=e99]: Rapide
        - generic [ref=e100]:
          - img [ref=e101]
          - generic [ref=e106]: Premium
      - paragraph [ref=e107]: © 2026 BNBGest · Gestion locative professionnelle
    - region "Notifications alt+T"
  - button "Open Next.js Dev Tools" [ref=e113] [cursor=pointer]:
    - img [ref=e114]
  - alert [ref=e118]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Simple Login Test', () => {
  4  |   test('Can login to admin', async ({ page }) => {
  5  |     console.log('🌐 Navigating to login page...');
  6  |     await page.goto('http://localhost:3000/login');
  7  |     
  8  |     console.log('✍️ Filling credentials...');
  9  |     await page.fill('#email', 'demo@bnbgest.com');
  10 |     await page.fill('#password', 'Demo1234!');
  11 |     
  12 |     console.log('🚀 Submitting...');
  13 |     await page.click('button[type="submit"]');
  14 |     
  15 |     console.log('⏳ Waiting for redirect...');
> 16 |     await page.waitForURL('**/admin**', { timeout: 20000 });
     |                ^ Error: page.waitForURL: Test timeout of 30000ms exceeded.
  17 |     
  18 |     console.log('✅ On admin page:', page.url());
  19 |     
  20 |     // Verify we're authenticated
  21 |     await expect(page).toHaveURL(/\/admin/);
  22 |     
  23 |     console.log('🎉 Test passed!');
  24 |   });
  25 | });
  26 | 
```