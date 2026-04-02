# 📧 Email Notifications - Documentation Complète

**Date** : 2 Avril 2026  
**Version** : 1.0.0  
**Service** : Resend

---

## 🎯 Vue d'Ensemble

Le système de notifications email de BNBGest utilise **Resend** pour envoyer des emails transactionnels professionnels aux clients et à l'équipe.

### Types d'Emails Disponibles

1. **Confirmation de réservation** - Envoyé au client après confirmation
2. **Rappel check-in** - Envoyé 48h avant l'arrivée
3. **Notification nettoyage** - Envoyé à l'équipe de nettoyage
4. **Notification avis** - Envoyé au propriétaire quand un avis est reçu
5. **Email de bienvenue** - Envoyé aux nouveaux utilisateurs

---

## 🚀 Configuration

### 1. Variables d'Environnement

Ajoutez dans `.env.local` :

```env
# Resend API Key
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxx

# Email de l'expéditeur (doit être vérifié dans Resend)
RESEND_FROM_EMAIL=BNBGest <noreply@bnbgest.com>

# URL de l'application (pour les liens dans les emails)
NEXTAUTH_URL=https://bnbgest.vercel.app
```

### 2. Obtenir une API Key Resend

1. Créer un compte sur [resend.com](https://resend.com)
2. Vérifier votre domaine (ou utiliser onboarding@resend.dev pour les tests)
3. Générer une API Key dans Settings → API Keys
4. Copier la clé dans `RESEND_API_KEY`

### 3. Vérifier le Domaine

**Pour la production** :
1. Aller dans Settings → Domains
2. Ajouter votre domaine (ex: bnbgest.com)
3. Configurer les DNS records (SPF, DKIM, DMARC)
4. Attendre la vérification (~24h)

**Pour le développement** :
- Utiliser `onboarding@resend.dev` (limite: 100 emails/jour)

---

## 📦 Packages Installés

```json
{
  "dependencies": {
    "resend": "^3.0.0",
    "@react-email/components": "^0.0.13",
    "@react-email/render": "^0.0.12"
  }
}
```

---

## 🏗️ Architecture

```
lib/
├── email.ts                    # Service de base Resend
├── email-templates.tsx         # Templates React Email
└── email-notifications.ts      # Fonctions d'envoi spécifiques

app/api/
└── email/
    └── test/
        └── route.ts            # API de test des emails
```

---

## 📝 Utilisation

### 1. Envoi Email de Confirmation Réservation

```typescript
import { sendBookingConfirmationEmail } from '@/lib/email-notifications';

// Après création d'une réservation
await sendBookingConfirmationEmail({
  id: booking.id,
  guestName: booking.guestName,
  guestEmail: booking.guestEmail,
  checkIn: booking.checkIn,
  checkOut: booking.checkOut,
  guests: booking.guests,
  totalPrice: booking.totalPrice,
  property: {
    name: booking.property.name,
    address: booking.property.address,
    city: booking.property.city,
  },
});
```

### 2. Envoi Rappel Check-in

```typescript
import { sendCheckInReminderEmail } from '@/lib/email-notifications';

// 48h avant le check-in (via cron job)
await sendCheckInReminderEmail({
  guestName: booking.guestName,
  guestEmail: booking.guestEmail,
  checkIn: booking.checkIn,
  property: {
    name: booking.property.name,
    address: booking.property.address,
    city: booking.property.city,
  },
});
```

### 3. Notification Nettoyage Assigné

```typescript
import { sendCleaningAssignedEmail } from '@/lib/email-notifications';

// Après assignation d'un nettoyage
await sendCleaningAssignedEmail({
  scheduledDate: cleaning.scheduledDate,
  assignedTo: cleaning.assignedTo,
  assignedToEmail: 'cleaner@example.com',
  property: {
    name: property.name,
    address: property.address,
    city: property.city,
  },
  notes: cleaning.notes,
});
```

### 4. Notification Avis Reçu

```typescript
import { sendReviewReceivedEmail } from '@/lib/email-notifications';

// Après création d'un avis
await sendReviewReceivedEmail({
  id: review.id,
  rating: review.rating,
  comment: review.comment,
  booking: {
    guestName: booking.guestName,
    property: {
      name: property.name,
      user: {
        name: owner.name,
        email: owner.email,
      },
    },
  },
});
```

### 5. Email de Bienvenue

```typescript
import { sendWelcomeEmail } from '@/lib/email-notifications';

// Après création d'un utilisateur
await sendWelcomeEmail({
  name: user.name,
  email: user.email,
  role: user.role,
});
```

---

## 🧪 Tests

### Test via API Route

```bash
# Obtenir les types d'emails disponibles
curl https://bnbgest.vercel.app/api/email/test

# Envoyer un email de test (nécessite auth ADMIN)
curl -X POST https://bnbgest.vercel.app/api/email/test \
  -H "Content-Type: application/json" \
  -d '{
    "type": "booking-confirmation",
    "testEmail": "test@example.com"
  }'
```

### Types d'emails de test disponibles

- `booking-confirmation` - Confirmation de réservation
- `checkin-reminder` - Rappel check-in
- `welcome` - Email de bienvenue

---

## 🎨 Templates Email

### Personnalisation

Les templates sont dans `lib/email-templates.tsx` et utilisent React Email.

**Structure d'un template** :
```tsx
export function MyCustomEmail({ prop1, prop2 }) {
  return (
    <Html>
      <Head />
      <Body style={styles.body}>
        <Container style={styles.container}>
          {/* Contenu */}
        </Container>
      </Body>
    </Html>
  );
}
```

**Styles disponibles** :
- `styles.header` - En-tête avec logo
- `styles.greeting` - Salutation
- `styles.paragraph` - Paragraphe
- `styles.button` - Bouton CTA
- `styles.bookingDetails` - Bloc détails
- `styles.footer` - Pied de page

### Prévisualiser les Templates

```bash
# Installer React Email CLI (optionnel)
npm install -D @react-email/cli

# Lancer le preview server
npx email dev
```

---

## 🔄 Intégrations Automatiques

### API Bookings

L'email de confirmation est automatiquement envoyé quand :
- Une nouvelle réservation est créée avec status `CONFIRMED`

```typescript
// app/api/bookings/route.ts
if (booking.status === 'CONFIRMED') {
  await sendBookingConfirmationEmail({...});
}
```

### Planifié via Cron Jobs

**Rappels check-in** (à implémenter) :
```typescript
// app/api/cron/checkin-reminders/route.ts
export async function GET() {
  // Trouver toutes les réservations avec check-in dans 48h
  const upcomingBookings = await prisma.booking.findMany({
    where: {
      checkIn: {
        gte: new Date(Date.now() + 47 * 60 * 60 * 1000),
        lte: new Date(Date.now() + 49 * 60 * 60 * 1000),
      },
      status: 'CONFIRMED',
    },
  });

  // Envoyer rappel pour chaque
  for (const booking of upcomingBookings) {
    await sendCheckInReminderEmail({...});
  }
}
```

**Configuration Vercel Cron** :
```json
// vercel.json
{
  "crons": [{
    "path": "/api/cron/checkin-reminders",
    "schedule": "0 12 * * *"  // Chaque jour à 12h
  }]
}
```

---

## 📊 Monitoring & Logs

### Logs Console

Les emails loggent automatiquement :
```
✅ Email de confirmation envoyé à guest@example.com
✅ Email envoyé: re_abc123xyz
```

### Dashboard Resend

1. Aller sur [resend.com/emails](https://resend.com/emails)
2. Voir tous les emails envoyés
3. Statut : Delivered, Bounced, Complained
4. Ouvrir les emails pour voir le contenu

### Mode Développement

Sans `RESEND_API_KEY`, les emails sont simulés :
```
📧 [DEV] Email simulé: {
  to: 'guest@example.com',
  subject: 'Confirmation de réservation'
}
```

---

## ⚙️ Configuration Avancée

### Rate Limiting

Resend a des limites :
- **Free Plan** : 100 emails/jour, 3,000/mois
- **Pro Plan** : 50,000 emails/mois, $20/mois
- **Business** : Illimité

### Batch Emails

Pour envoyer plusieurs emails :
```typescript
import { sendBatchEmails } from '@/lib/email';

await sendBatchEmails([
  {
    to: 'user1@example.com',
    subject: 'Test',
    html: '<p>Hello</p>',
  },
  {
    to: 'user2@example.com',
    subject: 'Test',
    html: '<p>Hello</p>',
  },
]);
```

### Reply-To

Configurer un email de réponse :
```typescript
await sendEmail({
  to: 'guest@example.com',
  subject: 'Confirmation',
  html: emailHtml,
  replyTo: 'support@bnbgest.com',  // ✅
});
```

---

## 🛡️ Sécurité & Best Practices

### 1. Ne jamais exposer l'API Key
```typescript
// ❌ MAUVAIS
const apiKey = 're_abc123';

// ✅ BON
const apiKey = process.env.RESEND_API_KEY;
```

### 2. Validation des emails
```typescript
function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

if (!isValidEmail(guestEmail)) {
  throw new Error('Email invalide');
}
```

### 3. Gestion des erreurs
```typescript
try {
  await sendBookingConfirmationEmail({...});
} catch (error) {
  console.error('⚠️ Erreur email (non bloquant):', error);
  // Ne pas bloquer la création si l'email échoue
}
```

### 4. Rate Limiting
```typescript
// Limiter les envois par user/IP
const rateLimit = new Map();

function canSendEmail(userId: string) {
  const lastSent = rateLimit.get(userId);
  if (lastSent && Date.now() - lastSent < 60000) {
    return false; // Max 1 email/minute
  }
  rateLimit.set(userId, Date.now());
  return true;
}
```

---

## 🎯 Prochaines Étapes

### Phase 1 - Cron Jobs (Cette semaine)
- [ ] Implémenter `/api/cron/checkin-reminders`
- [ ] Configurer Vercel Cron
- [ ] Tester envois automatiques

### Phase 2 - Templates Avancés (Semaine prochaine)
- [ ] Email check-out avec demande d'avis
- [ ] Email facture PDF
- [ ] Email rapport mensuel propriétaire
- [ ] Email rappel paiement

### Phase 3 - Fonctionnalités (Dans 2 semaines)
- [ ] Centre de préférences emails
- [ ] Désabonnement (unsubscribe)
- [ ] Templates personnalisables par propriétaire
- [ ] Analytics emails (taux d'ouverture)

---

## 📚 Resources

**Documentation** :
- Resend Docs : https://resend.com/docs
- React Email : https://react.email
- Next.js Email : https://nextjs.org/docs/app/building-your-application/routing/route-handlers

**Support** :
- Resend Support : support@resend.com
- GitHub Issues : https://github.com/resendlabs/resend-node

---

**Dernière mise à jour** : 2 Avril 2026  
**Version** : 1.0.0  
**Status** : ✅ Opérationnel
