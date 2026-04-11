/**
 * Script final pour générer le storage state
 * Utilise les credentials des variables d'environnement
 */
import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

async function generateStorageState() {
  console.log('\n🔐 Génération du storage state...\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navigate to login
    console.log('🌐 Navigation vers /login...');
    await page.goto('http://localhost:3000/login');
    await page.waitForLoadState('networkidle');
    
    // Fill credentials
    console.log('✍️ Remplissage des credentials...');
    await page.fill('#email', 'demo@bnbgest.com');
    await page.fill('#password', 'Demo1234!');
    
    // Submit
    console.log('🚀 Soumission du formulaire...');
    await page.click('button[type="submit"]');
    
    // Wait for redirect - essayons plusieurs patterns
    console.log('⏳ Attente de la redirection...');
    try {
      await page.waitForURL('**/admin**', { timeout: 10000 });
    } catch (e) {
      // Fallback: attendre juste que l'URL change
      await page.waitForURL(url => url.pathname !== '/login', { timeout: 10000 });
    }
    
    // Wait for page load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Attendre un peu plus pour être sûr
    
    console.log('✅ Page chargée:', page.url());
    
    // Save storage state
    const authDir = path.join(process.cwd(), 'playwright', '.auth');
    if (!fs.existsSync(authDir)) {
      fs.mkdirSync(authDir, { recursive: true });
    }
    
    await context.storageState({ path: 'playwright/.auth/user.json' });
    console.log('💾 Storage state sauvegardé!\n');
    
    await browser.close();
    
    console.log('🎉 Succès! Le storage state est prêt pour les tests.\n');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Erreur:', error);
    console.log('\n📸 Capture d\'écran pour debug...');
    await page.screenshot({ path: 'error-screenshot.png', fullPage: true });
    console.log('💾 Screenshot sauvegardé: error-screenshot.png\n');
    await browser.close();
    process.exit(1);
  }
}

generateStorageState();
