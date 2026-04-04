# 🏠 Guide d'Activation de l'API Airbnb Officielle

**Date:** 3 Avril 2026  
**Status:** 🔶 Configuration requise

---

## ⚠️ Information Importante

**L'API Airbnb officielle n'est PAS publiquement accessible.**

Airbnb ne propose **PAS** d'API publique pour les développeurs tiers. L'accès à l'API Airbnb est réservé exclusivement à :

1. **Partenaires officiels Airbnb** (Channel Managers certifiés)
2. **Grandes entreprises** avec contrats spéciaux
3. **Airbnb for Work** (entreprises B2B)

---

## 🎯 Solutions Alternatives Réelles

### Solution 1: Channel Manager Certifié (RECOMMANDÉ) ✅

Utilisez un **Channel Manager** certifié par Airbnb qui a accès à l'API:

#### **A. Hostaway** (Le plus populaire)
- ✅ API complète Airbnb
- ✅ Synchronisation bidirectionnelle
- ✅ Multi-plateformes (Airbnb, Booking, VRBO)
- 💰 Prix: À partir de $29/mois (5 listings)
- 🔗 https://www.hostaway.com

**Intégration:**
```typescript
// lib/hostaway-api.ts
export class HostawayClient {
  private apiKey: string;
  private accountId: string;
  
  constructor() {
    this.apiKey = process.env.HOSTAWAY_API_KEY!;
    this.accountId = process.env.HOSTAWAY_ACCOUNT_ID!;
  }
  
  async getListings() {
    const response = await fetch('https://api.hostaway.com/v1/listings', {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    return response.json();
  }
  
  async getReservations() {
    const response = await fetch('https://api.hostaway.com/v1/reservations', {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      }
    });
    return response.json();
  }
}
```

#### **B. Guesty** (Enterprise-grade)
- ✅ API Airbnb complète
- ✅ Automation avancée
- ✅ Multi-propriétés
- 💰 Prix: À partir de $39/mois
- 🔗 https://www.guesty.com

#### **C. Smoobu** (Europe-friendly)
- ✅ API Airbnb
- ✅ Interface en français
- ✅ Support EUR
- 💰 Prix: À partir de €29/mois
- 🔗 https://www.smoobu.com

---

### Solution 2: iCal Synchronization (GRATUIT) ✅

**Airbnb fournit des flux iCal** pour chaque propriété. C'est gratuit mais limité.

#### Avantages:
- ✅ Gratuit
- ✅ Officiel Airbnb
- ✅ Aucune autorisation nécessaire
- ✅ Synchronisation calendrier

#### Limitations:
- ❌ Lecture seule (import uniquement)
- ❌ Délai de synchronisation (2-24h)
- ❌ Pas de réservations détaillées
- ❌ Pas de prix dynamiques
- ❌ Pas de messages

#### Implémentation:

```typescript
// lib/airbnb-ical.ts
import ical from 'node-ical';
import prisma from './prisma';

export async function syncAirbnbCalendar(propertyId: number, icalUrl: string) {
  try {
    // Fetch iCal data
    const events = await ical.async.fromURL(icalUrl);
    
    const bookings = [];
    
    for (const event of Object.values(events)) {
      if (event.type === 'VEVENT') {
        bookings.push({
          propertyId,
          guestName: event.summary || 'Airbnb Guest',
          guestEmail: 'guest@airbnb.com',
          checkIn: event.start,
          checkOut: event.end,
          source: 'AIRBNB',
          externalId: event.uid,
          status: 'CONFIRMED'
        });
      }
    }
    
    // Upsert bookings
    for (const booking of bookings) {
      await prisma.booking.upsert({
        where: { 
          externalId: booking.externalId 
        },
        create: booking,
        update: {
          checkIn: booking.checkIn,
          checkOut: booking.checkOut
        }
      });
    }
    
    return { success: true, count: bookings.length };
  } catch (error) {
    console.error('iCal sync error:', error);
    throw error;
  }
}
```

**Installation:**
```bash
npm install node-ical
npm install @types/node-ical --save-dev
```

**Configuration dans Prisma:**
```prisma
model Property {
  // ... existing fields
  icalUrl         String?   // URL du calendrier iCal Airbnb
  lastIcalSync    DateTime? // Dernière synchronisation iCal
}

model IntegrationSetting {
  // ... existing fields
  icalUrl         String?   // URL iCal principale (déjà existant)
}
```

---

### Solution 3: Web Scraping (DÉCONSEILLÉ) ⚠️

**NE PAS UTILISER** - Viole les conditions d'utilisation d'Airbnb.

---

## 🔧 Configuration Recommandée pour BNBGest

### Approche Hybride (Meilleure Solution)

Combinez les deux approches:

1. **Channel Manager** (Hostaway/Guesty) pour:
   - Synchronisation bidirectionnelle
   - Gestion des réservations
   - Prix dynamiques
   - Messages invités

2. **iCal de secours** pour:
   - Backup gratuit
   - Propriétés non gérées par le Channel Manager
   - Vérification de cohérence

---

## 📝 Étapes pour Activer l'Intégration Réelle

### Option A: Avec Hostaway (Recommandé)

#### Étape 1: Créer un compte Hostaway
```
1. Aller sur https://www.hostaway.com
2. S'inscrire (essai gratuit 14 jours)
3. Connecter votre compte Airbnb
4. Obtenir API Key dans Settings > API
```

#### Étape 2: Configuration BNBGest

**Ajouter variables d'environnement:**
```env
# .env.local
HOSTAWAY_API_KEY="your_api_key_here"
HOSTAWAY_ACCOUNT_ID="your_account_id"
HOSTAWAY_BASE_URL="https://api.hostaway.com/v1"
```

#### Étape 3: Créer le client Hostaway

Créez `lib/hostaway-client.ts` (je peux le générer pour vous).

#### Étape 4: Routes API

Adaptez les routes existantes pour utiliser Hostaway au lieu de l'API Airbnb directe.

---

### Option B: Avec iCal (Gratuit)

#### Étape 1: Obtenir l'URL iCal d'Airbnb

```
1. Connectez-vous à Airbnb Host
2. Allez dans votre propriété
3. Calendrier > Exporter le calendrier
4. Copiez l'URL iCal
5. Format: https://www.airbnb.com/calendar/ical/XXXXXXX.ics?s=YYYYYYY
```

#### Étape 2: Sauvegarder dans BNBGest

```typescript
// Via l'interface Settings > Integrations
await prisma.property.update({
  where: { id: propertyId },
  data: {
    icalUrl: 'https://www.airbnb.com/calendar/ical/XXXXXXX.ics?s=YYYYYYY'
  }
});
```

#### Étape 3: Synchronisation automatique

Créez un cron job (je peux le générer).

---

## 🎯 Comparatif des Solutions

| Critère | Hostaway | Guesty | iCal | API Directe |
|---------|----------|--------|------|-------------|
| **Coût** | €29/mois | €39/mois | Gratuit | Inaccessible |
| **Sync Réservations** | Temps réel | Temps réel | 2-24h | - |
| **Bidirectionnel** | ✅ | ✅ | ❌ | - |
| **Prix dynamiques** | ✅ | ✅ | ❌ | - |
| **Messages** | ✅ | ✅ | ❌ | - |
| **Multi-plateformes** | ✅ | ✅ | ❌ | - |
| **Complexité setup** | Faible | Moyenne | Très faible | Impossible |
| **Support** | Excellent | Excellent | N/A | - |

---

## 🚀 Recommandation Finale

### Pour Production: Hostaway + iCal Backup

**Phase 1 (Immédiat):**
1. ✅ Implémenter synchronisation iCal (gratuit)
2. ✅ Tester avec une propriété
3. ✅ Cron job toutes les 6 heures

**Phase 2 (Après validation):**
1. 📊 S'inscrire à Hostaway (essai gratuit)
2. 🔗 Connecter Airbnb via Hostaway
3. 🔄 Remplacer iCal par Hostaway API
4. ✅ Synchronisation temps réel

**Coût estimé:** €29/mois pour 5 propriétés

---

## 📞 Prochaines Étapes

**Que souhaitez-vous faire?**

### Option 1: Configuration iCal (Gratuit, 30 min)
Je peux vous créer:
- ✅ Client iCal synchronization
- ✅ Route API `/api/integrations/airbnb/ical-sync`
- ✅ Cron job automatique
- ✅ Interface UI pour ajouter l'URL iCal

### Option 2: Configuration Hostaway (Payant, 2h)
Je peux vous créer:
- ✅ Client Hostaway complet
- ✅ Routes API complètes (listings, reservations, messages)
- ✅ Synchronisation bidirectionnelle
- ✅ Interface de configuration
- ✅ Tests et documentation

### Option 3: Les Deux (Hybride)
Solution la plus robuste:
- iCal comme backup
- Hostaway comme solution principale

---

## 📚 Ressources

### Documentation Officielle
- **Hostaway API:** https://api-docs.hostaway.com
- **Guesty API:** https://guesty.stoplight.io
- **iCal RFC:** https://icalendar.org

### Support Airbnb
- **Help Center:** https://www.airbnb.com/help
- **Partners:** https://www.airbnb.com/partners

---

## ⚡ Action Immédiate

**Dites-moi quelle solution vous préférez et je génère le code complet!**

1. 🆓 **iCal gratuit** (limité mais fonctionnel)
2. 💰 **Hostaway** (professionnel, temps réel)
3. 🔄 **Les deux** (redondance et flexibilité)

Je peux implémenter n'importe quelle solution en quelques minutes! 🚀
