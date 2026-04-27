# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: visual\responsive.spec.ts >> Responsive Design - Orientation >> Tablet portrait - Bookings
- Location: tests\visual\responsive.spec.ts:48:7

# Error details

```
TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
Call log:
  - waiting for locator('#email') to be visible

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
  28  |   // Navigate to login page directly with absolute URL
  29  |   await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' });
  30  |   
  31  |   // Wait for login form to be interactive
> 32  |   await page.waitForSelector('#email', { state: 'visible', timeout: 10000 });
      |              ^ TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
  33  |   await page.waitForSelector('#password', { state: 'visible', timeout: 10000 });
  34  |   
  35  |   // Small delay to ensure React hydration is complete
  36  |   await page.waitForTimeout(500);
  37  |   
  38  |   // Fill credentials with force option to bypass any overlays
  39  |   await page.fill('#email', loginEmail, { force: true });
  40  |   await page.fill('#password', loginPassword, { force: true });
  41  |   
  42  |   // Wait a moment for React state to update
  43  |   await page.waitForTimeout(300);
  44  |   
  45  |   // Submit and wait for redirect
  46  |   await page.click('button[type="submit"]');
  47  |   await page.waitForURL('**/admin**', { timeout: 20000 });
  48  |   
  49  |   // Wait for page to be fully loaded
  50  |   await page.waitForLoadState('networkidle');
  51  | }
  52  | 
  53  | /**
  54  |  * Logout from the application
  55  |  */
  56  | export async function logout(page: Page) {
  57  |   // Navigate to NextAuth signout page
  58  |   await page.goto('/api/auth/signout');
  59  |   
  60  |   // Wait for signout form
  61  |   await page.waitForSelector('form', { timeout: 5000 });
  62  |   
  63  |   // Click signout button
  64  |   await page.click('form button');
  65  |   
  66  |   // Wait for redirect to home
  67  |   await page.waitForURL('/', { timeout: 5000 });
  68  | }
  69  | 
  70  | /**
  71  |  * Check if user is authenticated
  72  |  */
  73  | export async function isAuthenticated(page: Page): Promise<boolean> {
  74  |   try {
  75  |     const url = page.url();
  76  |     
  77  |     // Must be on /admin URL
  78  |     if (!url.includes('/admin')) {
  79  |       return false;
  80  |     }
  81  |     
  82  |     // Wait for AdminSidebar to be present
  83  |     await page.waitForSelector('[data-testid="admin-sidebar"]', { timeout: 5000 });
  84  |     
  85  |     return true;
  86  |   } catch {
  87  |     return false;
  88  |   }
  89  | }
  90  | 
  91  | /**
  92  |  * Setup authentication state for tests
  93  |  * 
  94  |  * Session 20: Temporary workaround - always login manually
  95  |  * TODO: Fix storage state generation issue
  96  |  */
  97  | export async function setupAuth(page: Page) {
  98  |   // Always do manual login for now
  99  |   console.log('🔐 Logging in...');
  100 |   await login(page);
  101 |   
  102 |   console.log('✅ Login complete, waiting for sidebar...');
  103 |   
  104 |   // Give the page a moment to hydrate
  105 |   await page.waitForTimeout(1000);
  106 |   
  107 |   // Wait for AdminSidebar to be fully rendered
  108 |   await page.waitForSelector('[data-testid="admin-sidebar"]', { timeout: 15000 });
  109 |   
  110 |   console.log('✅ Sidebar found!');
  111 |   
  112 |   // Wait for at least one tab to be present
  113 |   await page.waitForSelector('[data-testid="bookings-tab"]', { timeout: 10000 });
  114 |   
  115 |   console.log('✅ Tabs loaded!');
  116 |   
  117 |   // Small hydration wait
  118 |   await page.waitForTimeout(200);
  119 |   
  120 |   // Verify we're authenticated
  121 |   const authenticated = await isAuthenticated(page);
  122 |   if (!authenticated) {
  123 |     throw new Error('Failed to authenticate user');
  124 |   }
  125 |   
  126 |   console.log('✅ Authenticated successfully');
  127 | }
  128 | 
```