/**
 * Script autonome pour générer le storage state d'authentification
 * Utilisé quand playwright/.auth/user.json n'existe pas
 */
import { chromium } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seedTestUser() {
  const email = 'demo@bnbgest.com';
  const password = 'Demo1234!';
  const hashedPassword = await bcrypt.hash(password, 10);

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    console.log('✅ Test user already exists:', email);
    return existingUser;
  }

  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name: 'Demo User',
      role: 'ADMIN',
    },
  });

  console.log('✅ Test user created successfully!');
  console.log('📧 Email:', email);
  console.log('🔑 Password: Demo1234!');
  return user;
}

async function generateAuthState() {
  console.log('\n🔐 Génération du storage state d\'authentification...\n');

  try {
    // 1. Créer l'utilisateur de test en base
    console.log('👤 Création de l\'utilisateur de test...');
    await seedTestUser();
    console.log('✅ Utilisateur de test créé: demo@bnbgest.com\n');

    // 2. Lancer le navigateur
    const browser = await chromium.launch({ headless: true }); // headless pour plus de stabilité
    const context = await browser.newContext();
    const page = await context.newPage();

    // Attendre un peu pour laisser le temps au serveur
    await page.waitForTimeout(2000);

    // 3. Naviguer vers la page de connexion
    console.log('🌐 Navigation vers http://localhost:3000/login...');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
    console.log('✅ Page chargée\n');

    // 4. Attendre le formulaire
    console.log('⏳ Attente du formulaire de connexion...');
    await page.waitForSelector('#email', { timeout: 10000 });
    console.log('✅ Formulaire trouvé\n');

    // 5. Remplir les credentials
    console.log('✍️ Remplissage des credentials...');
    await page.fill('#email', 'demo@bnbgest.com');
    await page.fill('#password', 'Demo1234!');
    console.log('✅ Credentials remplis\n');

    // 6. Soumettre et attendre la redirection
    console.log('🚀 Soumission du formulaire...');
    await Promise.all([
      page.waitForURL('**/admin**', { timeout: 15000 }),
      page.click('button[type="submit"]'),
    ]);
    console.log('✅ Redirection vers /admin réussie\n');

    // 7. Attendre la sidebar pour confirmer que la page est complètement chargée
    console.log('⏳ Attente de la sidebar admin...');
    await page.waitForSelector('[data-testid="admin-sidebar"]', { timeout: 10000 });
    console.log('✅ Sidebar chargée\n');

    // 8. Sauvegarder le storage state
    console.log('💾 Sauvegarde du storage state...');
    await context.storageState({ path: 'playwright/.auth/user.json' });
    console.log('✅ Storage state sauvegardé dans playwright/.auth/user.json\n');

    console.log('🎉 Authentification réussie! Le storage state est prêt.\n');

    // 9. Fermer le navigateur
    await browser.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Erreur lors de la génération du storage state:', error);
    process.exit(1);
  }
}

generateAuthState();
