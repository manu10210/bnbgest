# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: visual\visual-regression.spec.ts >> Visual Regression - Main Pages >> Dashboard - Full page
- Location: tests\visual\visual-regression.spec.ts:10:7

# Error details

```
TimeoutError: page.waitForSelector: Timeout 15000ms exceeded.
Call log:
  - waiting for locator('[data-testid="admin-sidebar"]') to be visible

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

# Test source

```ts
  1   | import { Page } from '@playwright/test';
  2   | 
  3   | /**
  4   |  * Helper functions for authentication in Playwright tests
  5   |  * 
  6   |  * Session 19: Storage state optimization
  7   |  * - Tests now reuse authenticated session (no repeated logins)
  8   |  * - setupAuth() simplified (just verification, login already done)
  9   |  * - Fallback to manual login if storage state fails
  10  |  * 
  11  |  * IMPORTANT: Ces tests utilisent l'environnement local.
  12  |  * Pour CI/CD, configurer TEST_USER_EMAIL et TEST_USER_PASSWORD dans secrets GitHub.
  13  |  */
  14  | 
  15  | export const testCredentials = {
  16  |   email: process.env.TEST_USER_EMAIL || 'demo@bnbgest.com',
  17  |   password: process.env.TEST_USER_PASSWORD || 'Demo1234!',
  18  | };
  19  | 
  20  | /**
  21  |  * Login to the application using NextAuth
  22  |  * Handles the full login flow and waits for redirect to /admin
  23  |  */
  24  | export async function login(page: Page, email?: string, password?: string) {
  25  |   const loginEmail = email || testCredentials.email;
  26  |   const loginPassword = password || testCredentials.password;
  27  | 
  28  |   // Navigate to login page directly
  29  |   await page.goto('http://localhost:3000/login');
  30  |   
  31  |   // Wait for login form to load
  32  |   await page.waitForSelector('#email', { timeout: 10000 });
  33  |   
  34  |   // Fill credentials
  35  |   await page.fill('#email', loginEmail);
  36  |   await page.fill('#password', loginPassword);
  37  |   
  38  |   // Submit and wait for redirect
  39  |   await page.click('button[type="submit"]');
  40  |   await page.waitForURL('**/admin**', { timeout: 20000 });
  41  |   
  42  |   // Wait for page to be fully loaded
  43  |   await page.waitForLoadState('networkidle');
  44  | }
  45  | 
  46  | /**
  47  |  * Logout from the application
  48  |  */
  49  | export async function logout(page: Page) {
  50  |   // Navigate to NextAuth signout page
  51  |   await page.goto('/api/auth/signout');
  52  |   
  53  |   // Wait for signout form
  54  |   await page.waitForSelector('form', { timeout: 5000 });
  55  |   
  56  |   // Click signout button
  57  |   await page.click('form button');
  58  |   
  59  |   // Wait for redirect to home
  60  |   await page.waitForURL('/', { timeout: 5000 });
  61  | }
  62  | 
  63  | /**
  64  |  * Check if user is authenticated
  65  |  */
  66  | export async function isAuthenticated(page: Page): Promise<boolean> {
  67  |   try {
  68  |     const url = page.url();
  69  |     
  70  |     // Must be on /admin URL
  71  |     if (!url.includes('/admin')) {
  72  |       return false;
  73  |     }
  74  |     
  75  |     // Wait for AdminSidebar to be present
  76  |     await page.waitForSelector('[data-testid="admin-sidebar"]', { timeout: 5000 });
  77  |     
  78  |     return true;
  79  |   } catch {
  80  |     return false;
  81  |   }
  82  | }
  83  | 
  84  | /**
  85  |  * Setup authentication state for tests
  86  |  * 
  87  |  * Session 20: Temporary workaround - always login manually
  88  |  * TODO: Fix storage state generation issue
  89  |  */
  90  | export async function setupAuth(page: Page) {
  91  |   // Always do manual login for now
  92  |   console.log('🔐 Logging in...');
  93  |   await login(page);
  94  |   
  95  |   console.log('✅ Login complete, waiting for sidebar...');
  96  |   
  97  |   // Give the page a moment to hydrate
  98  |   await page.waitForTimeout(1000);
  99  |   
  100 |   // Wait for AdminSidebar to be fully rendered
> 101 |   await page.waitForSelector('[data-testid="admin-sidebar"]', { timeout: 15000 });
      |              ^ TimeoutError: page.waitForSelector: Timeout 15000ms exceeded.
  102 |   
  103 |   console.log('✅ Sidebar found!');
  104 |   
  105 |   // Wait for at least one tab to be present
  106 |   await page.waitForSelector('[data-testid="bookings-tab"]', { timeout: 10000 });
  107 |   
  108 |   console.log('✅ Tabs loaded!');
  109 |   
  110 |   // Small hydration wait
  111 |   await page.waitForTimeout(200);
  112 |   
  113 |   // Verify we're authenticated
  114 |   const authenticated = await isAuthenticated(page);
  115 |   if (!authenticated) {
  116 |     throw new Error('Failed to authenticate user');
  117 |   }
  118 |   
  119 |   console.log('✅ Authenticated successfully');
  120 | }
  121 | 
```