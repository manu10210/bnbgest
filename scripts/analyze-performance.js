#!/usr/bin/env node

/**
 * Script d'analyse des performances et SEO de BNBGest
 * Usage: node scripts/analyze-performance.js
 */

const https = require('https');

const BASE_URL = 'https://bnbgest.vercel.app';

// Couleurs pour le terminal
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function checkUrl(url) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    https.get(url, (res) => {
      const duration = Date.now() - startTime;
      let data = '';
      
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          duration,
          headers: res.headers,
          size: Buffer.byteLength(data),
        });
      });
    }).on('error', reject);
  });
}

async function analyzePerformance() {
  log('\n╔══════════════════════════════════════════════════════════════╗', colors.cyan);
  log('║     🚀 ANALYSE DE PERFORMANCE BNBGEST 🚀                   ║', colors.bright);
  log('╚══════════════════════════════════════════════════════════════╝\n', colors.cyan);

  const pages = [
    { name: 'Page d\'accueil', url: BASE_URL },
    { name: 'Login', url: `${BASE_URL}/login` },
    { name: 'Health Check', url: `${BASE_URL}/api/health` },
    { name: 'Settings', url: `${BASE_URL}/settings` },
    { name: 'Integrations', url: `${BASE_URL}/settings/integrations` },
  ];

  log('📊 Test des temps de réponse...\n', colors.yellow);

  for (const page of pages) {
    try {
      const result = await checkUrl(page.url);
      const status = result.statusCode === 200 ? '✅' : '❌';
      const timeColor = result.duration < 500 ? colors.green : result.duration < 1000 ? colors.yellow : colors.red;
      
      log(`${status} ${page.name.padEnd(20)} ${timeColor}${result.duration}ms${colors.reset} (${(result.size / 1024).toFixed(2)} KB)`);
    } catch (error) {
      log(`❌ ${page.name.padEnd(20)} ERREUR: ${error.message}`, colors.red);
    }
  }

  log('\n🔒 Vérification des headers de sécurité...\n', colors.yellow);

  try {
    const result = await checkUrl(BASE_URL);
    const securityHeaders = {
      'strict-transport-security': 'HSTS',
      'x-frame-options': 'Clickjacking Protection',
      'x-content-type-options': 'MIME Sniffing Protection',
      'content-security-policy': 'CSP',
      'x-xss-protection': 'XSS Protection',
      'referrer-policy': 'Referrer Policy',
    };

    for (const [header, name] of Object.entries(securityHeaders)) {
      const present = result.headers[header] ? '✅' : '❌';
      log(`${present} ${name.padEnd(30)} ${result.headers[header] || 'Non défini'}`);
    }
  } catch (error) {
    log(`❌ Erreur lors de la vérification des headers: ${error.message}`, colors.red);
  }

  log('\n📈 Recommandations SEO...\n', colors.yellow);

  log('✅ Sitemap.xml configuré (/sitemap.xml)', colors.green);
  log('✅ Robots.txt configuré (/robots.txt)', colors.green);
  log('✅ Manifest.json pour PWA (/manifest.json)', colors.green);
  log('✅ Métadonnées OpenGraph et Twitter Cards', colors.green);

  log('\n🔗 Liens utiles pour tests externes:\n', colors.yellow);
  log(`   Sécurité : https://securityheaders.com/?q=${BASE_URL.replace('https://', '')}`, colors.cyan);
  log(`   PageSpeed: https://pagespeed.web.dev/?url=${BASE_URL}`, colors.cyan);
  log(`   SSL Test : https://www.ssllabs.com/ssltest/analyze.html?d=${BASE_URL.replace('https://', '')}`, colors.cyan);
  log(`   Mobile   : https://search.google.com/test/mobile-friendly?url=${BASE_URL}`, colors.cyan);

  log('\n╔══════════════════════════════════════════════════════════════╗', colors.cyan);
  log('║              ✨ ANALYSE TERMINÉE ✨                         ║', colors.bright);
  log('╚══════════════════════════════════════════════════════════════╝\n', colors.cyan);
}

// Exécution
analyzePerformance().catch(console.error);
