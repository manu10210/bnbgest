# 💳 Intégration Stripe - BNBGest

## 📋 Vue d'ensemble

Intégration complète de **Stripe** pour gérer les paiements des réservations dans BNBGest.

## 🎯 Fonctionnalités

✅ **Payment Intent API** - Paiements inline dans l'application  
✅ **Checkout Sessions** - Redirection vers page de paiement Stripe hébergée  
✅ **Webhooks** - Gestion automatique des événements de paiement  
✅ **Remboursements** - Traitement des remboursements  
✅ **Composants React** - Formulaires de paiement prêts à l'emploi  
✅ **TypeScript** - Type-safety complet  
✅ **Animations** - Interface fluide avec Framer Motion  

## 📦 Packages installés

```bash
npm install stripe @stripe/stripe-js @stripe/react-stripe-js
```

## 🔑 Configuration

### 1. Variables d'environnement

Ajoutez à `.env.local` :

```bash
# Stripe API Keys
STRIPE_SECRET_KEY=sk_test_xxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# Optional
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### 2. Obtenir les clés Stripe

1. Créer un compte sur [stripe.com](https://stripe.com)
2. Aller dans **Developers → API keys**
3. Copier :
   - **Secret key** → `STRIPE_SECRET_KEY`
   - **Publishable key** → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

### 3. Configurer les webhooks

1. Aller dans **Developers → Webhooks**
2. Cliquer sur **Add endpoint**
3. URL : `https://votre-domaine.com/api/stripe/webhook`
4. Sélectionner les événements :
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
   - `checkout.session.completed`
5. Copier le **Signing secret** → `STRIPE_WEBHOOK_SECRET`

## 🏗️ Architecture

### Fichiers créés

```
lib/
├── stripe.ts              # Configuration serveur + helpers
└── stripe-client.tsx      # Configuration client + Provider

app/api/stripe/
├── create-payment-intent/
│   └── route.ts          # Créer Payment Intent
├── create-checkout-session/
│   └── route.ts          # Créer Checkout Session
└── webhook/
    └── route.ts          # Traiter événements Stripe

components/stripe/
├── StripePaymentForm.tsx  # Formulaire de paiement inline
├── StripeCheckoutButton.tsx # Bouton Checkout
└── index.ts              # Exports
```

## 💻 Utilisation

### Option 1 : Payment Intent (Inline)

Paiement directement dans votre application.

```tsx
'use client';

import { useState, useEffect } from 'react';
import { StripeElementsProvider } from '@/lib/stripe-client';
import { StripePaymentForm } from '@/components/stripe';

export default function PaymentPage({ bookingId, amount }) {
  const [clientSecret, setClientSecret] = useState('');

  useEffect(() => {
    // Créer Payment Intent
    fetch('/api/stripe/create-payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId, amount }),
    })
      .then((res) => res.json())
      .then((data) => setClientSecret(data.clientSecret));
  }, [bookingId, amount]);

  if (!clientSecret) {
    return <div>Chargement...</div>;
  }

  return (
    <StripeElementsProvider clientSecret={clientSecret}>
      <StripePaymentForm
        amount={amount}
        bookingId={bookingId}
        onSuccess={() => console.log('Paiement réussi !')}
        onError={(error) => console.error(error)}
      />
    </StripeElementsProvider>
  );
}
```

### Option 2 : Checkout Session (Redirect)

Redirection vers page de paiement Stripe hébergée.

```tsx
import { StripeCheckoutButton } from '@/components/stripe';

export default function BookingCard({ booking }) {
  return (
    <div className="card">
      <h3>{booking.property.name}</h3>
      <p>Total : {booking.totalPrice} €</p>
      
      <StripeCheckoutButton
        bookingId={booking.id}
        amount={booking.totalPrice}
        propertyName={booking.property.name}
      />
    </div>
  );
}
```

## 🔌 API Routes

### POST /api/stripe/create-payment-intent

Créer un Payment Intent pour paiement inline.

**Request :**
```json
{
  "bookingId": "123",
  "amount": 250.50,
  "currency": "eur"
}
```

**Response :**
```json
{
  "success": true,
  "clientSecret": "pi_xxx_secret_xxx",
  "paymentIntentId": "pi_xxx",
  "amount": 250.50,
  "currency": "eur"
}
```

### POST /api/stripe/create-checkout-session

Créer une Checkout Session pour redirection.

**Request :**
```json
{
  "bookingId": "123"
}
```

**Response :**
```json
{
  "success": true,
  "sessionId": "cs_test_xxx",
  "url": "https://checkout.stripe.com/c/pay/cs_test_xxx"
}
```

### POST /api/stripe/webhook

Recevoir les événements Stripe (configuré automatiquement).

**Événements gérés :**
- ✅ `payment_intent.succeeded` - Paiement réussi
- ✅ `payment_intent.payment_failed` - Paiement échoué
- ✅ `charge.refunded` - Remboursement effectué
- ✅ `checkout.session.completed` - Checkout complété

## 🎨 Composants

### StripePaymentForm

Formulaire de paiement inline avec PaymentElement.

**Props :**
```tsx
interface StripePaymentFormProps {
  amount: number;              // Montant en euros
  currency?: string;           // Devise (défaut: 'EUR')
  bookingId: string;          // ID de la réservation
  onSuccess?: () => void;     // Callback succès
  onError?: (error: string) => void; // Callback erreur
}
```

**Exemple :**
```tsx
<StripePaymentForm
  amount={250.50}
  currency="EUR"
  bookingId="123"
  onSuccess={() => toast.success('Paiement réussi !')}
  onError={(error) => toast.error(error)}
/>
```

### StripeCheckoutButton

Bouton pour redirection vers Stripe Checkout.

**Props :**
```tsx
interface StripeCheckoutButtonProps {
  bookingId: string | number; // ID de la réservation
  amount: number;             // Montant
  currency?: string;          // Devise
  propertyName: string;       // Nom de la propriété
  disabled?: boolean;         // Désactiver le bouton
  className?: string;         // Classes CSS
}
```

**Exemple :**
```tsx
<StripeCheckoutButton
  bookingId={booking.id}
  amount={booking.totalPrice}
  propertyName={booking.property.name}
  disabled={booking.status !== 'PENDING'}
/>
```

## 🛠️ Helpers (lib/stripe.ts)

### createPaymentIntent

```tsx
const paymentIntent = await createPaymentIntent(
  250.50, // amount
  'eur',  // currency
  { bookingId: '123', propertyId: '456' } // metadata
);
```

### createCheckoutSession

```tsx
const session = await createCheckoutSession({
  bookingId: '123',
  amount: 250.50,
  currency: 'eur',
  customerEmail: 'client@example.com',
  propertyName: 'Villa Sunset',
  successUrl: 'https://app.com/success',
  cancelUrl: 'https://app.com/cancel',
});
```

### createRefund

```tsx
const refund = await createRefund(
  'pi_xxx', // paymentIntentId
  50.00,    // amount (optional, full refund if omitted)
  'requested_by_customer' // reason
);
```

### retrievePaymentIntent

```tsx
const paymentIntent = await retrievePaymentIntent('pi_xxx');
```

### cancelPaymentIntent

```tsx
const paymentIntent = await cancelPaymentIntent('pi_xxx');
```

## 🔐 Sécurité

### Vérification des webhooks

Les webhooks sont automatiquement vérifiés avec la signature Stripe :

```tsx
const event = verifyWebhookSignature(payload, signature);
if (!event) {
  return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
}
```

### Métadonnées

Toutes les transactions incluent des métadonnées pour traçabilité :

```json
{
  "bookingId": "123",
  "propertyId": "456",
  "propertyName": "Villa Sunset",
  "guestEmail": "client@example.com",
  "guestName": "Jean Dupont"
}
```

## 📊 Workflow complet

### 1. Création de réservation

```tsx
// Client crée une réservation
const booking = await fetch('/api/bookings', {
  method: 'POST',
  body: JSON.stringify({ /* ... */ }),
});
```

### 2. Paiement

**Option A - Payment Intent :**
```tsx
// Créer Payment Intent
const { clientSecret } = await fetch('/api/stripe/create-payment-intent', {
  method: 'POST',
  body: JSON.stringify({ bookingId, amount }),
});

// Afficher formulaire Stripe
<StripeElementsProvider clientSecret={clientSecret}>
  <StripePaymentForm ... />
</StripeElementsProvider>
```

**Option B - Checkout Session :**
```tsx
// Rediriger vers Stripe
<StripeCheckoutButton bookingId={booking.id} amount={booking.totalPrice} />
```

### 3. Confirmation automatique

Le webhook `/api/stripe/webhook` reçoit l'événement `payment_intent.succeeded` :

```tsx
// 1. Mettre à jour réservation → status: 'CONFIRMED'
await prisma.booking.update({
  where: { id: bookingId },
  data: { status: 'CONFIRMED' },
});

// 2. Créer entrée paiement
await prisma.payment.create({
  data: {
    bookingId,
    amount,
    method: 'STRIPE',
    status: 'COMPLETED',
    transactionId: paymentIntent.id,
  },
});

// 3. Envoyer email de confirmation (si configuré)
await sendBookingConfirmationEmail(booking);
```

## 🧪 Tests

### Mode Test Stripe

Utilisez les clés de test Stripe pour développement :
- `sk_test_...` (Secret key)
- `pk_test_...` (Publishable key)

### Cartes de test

```
Succès :        4242 4242 4242 4242
Échec :         4000 0000 0000 0002
3D Secure :     4000 0027 6000 3184
Insuffisant :   4000 0000 0000 9995

Date : Future (ex: 12/34)
CVC : N'importe quel 3 chiffres
```

### Tester les webhooks localement

```bash
# Installer Stripe CLI
brew install stripe/stripe-brew/stripe

# Login
stripe login

# Forward webhooks
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Copier le webhook secret affiché → STRIPE_WEBHOOK_SECRET
```

### Déclencher un événement test

```bash
stripe trigger payment_intent.succeeded
```

## 🎯 Cas d'usage

### 1. Paiement à la réservation

```tsx
// Client page - Après création de réservation
<StripeCheckoutButton
  bookingId={newBooking.id}
  amount={newBooking.totalPrice}
  propertyName={property.name}
/>
```

### 2. Paiement d'acompte

```tsx
const deposit = booking.totalPrice * 0.30; // 30%

<StripePaymentForm
  amount={deposit}
  bookingId={booking.id}
  onSuccess={() => {
    // Marquer acompte payé
    updateBooking({ depositPaid: true });
  }}
/>
```

### 3. Paiement du solde

```tsx
const balance = booking.totalPrice - booking.depositAmount;

<StripePaymentForm
  amount={balance}
  bookingId={booking.id}
  onSuccess={() => {
    // Marquer solde payé
    updateBooking({ balancePaid: true, status: 'CONFIRMED' });
  }}
/>
```

### 4. Remboursement

```tsx
// Admin dashboard
const handleRefund = async () => {
  const payment = await prisma.payment.findFirst({
    where: { bookingId: booking.id },
  });

  await createRefund(
    payment.transactionId,
    booking.totalPrice,
    'requested_by_customer'
  );
};
```

## 🎨 Personnalisation

### Thème Stripe Elements

Dans `lib/stripe-client.tsx` :

```tsx
const options = {
  appearance: {
    theme: 'stripe', // ou 'night' pour dark mode
    variables: {
      colorPrimary: '#FF385C',      // Couleur principale
      colorBackground: '#ffffff',   // Fond
      colorText: '#222222',         // Texte
      colorDanger: '#df1b41',       // Erreurs
      fontFamily: 'system-ui',      // Police
      borderRadius: '8px',          // Arrondi
    },
  },
};
```

### Dark mode

```tsx
import { darkTheme } from '@/lib/stripe-client';

<StripeElementsProvider options={{ appearance: darkTheme }}>
  <StripePaymentForm ... />
</StripeElementsProvider>
```

## 📈 Monitoring

### Dashboard Stripe

- **Paiements** : [dashboard.stripe.com/payments](https://dashboard.stripe.com/payments)
- **Clients** : [dashboard.stripe.com/customers](https://dashboard.stripe.com/customers)
- **Webhooks** : [dashboard.stripe.com/webhooks](https://dashboard.stripe.com/webhooks)
- **Logs** : [dashboard.stripe.com/logs](https://dashboard.stripe.com/logs)

### Logs application

```tsx
// Tous les événements sont loggés
console.log('✅ Payment Intent créé: pi_xxx pour 250€');
console.log('❌ Paiement échoué pour réservation 123');
console.log('📨 Webhook Stripe reçu: payment_intent.succeeded');
```

## 🚨 Gestion des erreurs

### Erreurs communes

| Erreur | Cause | Solution |
|--------|-------|----------|
| `Stripe non configuré` | Clé API manquante | Ajouter `STRIPE_SECRET_KEY` |
| `Invalid signature` | Webhook secret incorrect | Vérifier `STRIPE_WEBHOOK_SECRET` |
| `Card declined` | Carte refusée | Utiliser une autre carte |
| `Insufficient funds` | Solde insuffisant | Contacter banque |

### Gestion dans le code

```tsx
try {
  const paymentIntent = await createPaymentIntent(amount);
} catch (error) {
  if (error.code === 'card_declined') {
    toast.error('Carte refusée');
  } else if (error.code === 'insufficient_funds') {
    toast.error('Solde insuffisant');
  } else {
    toast.error('Erreur de paiement');
  }
}
```

## ✅ Checklist de déploiement

- [ ] Créer compte Stripe
- [ ] Ajouter clés API à `.env.local`
- [ ] Ajouter clés à Vercel Environment Variables
- [ ] Configurer webhook Stripe
- [ ] Tester paiement en mode test
- [ ] Vérifier réception des webhooks
- [ ] Tester remboursement
- [ ] Activer mode Live sur Stripe
- [ ] Remplacer clés test par clés live
- [ ] Tester paiement réel
- [ ] Monitorer dashboard Stripe

## 📚 Ressources

- [Documentation Stripe](https://stripe.com/docs)
- [Stripe API Reference](https://stripe.com/docs/api)
- [React Stripe.js](https://stripe.com/docs/stripe-js/react)
- [Testing Stripe](https://stripe.com/docs/testing)
- [Webhooks Guide](https://stripe.com/docs/webhooks)

## 🎉 Résultat

Système de paiement Stripe **complet et production-ready** :

✅ **2 méthodes de paiement** - Payment Intent + Checkout  
✅ **Webhooks automatiques** - Confirmation instantanée  
✅ **Composants React** - Prêts à l'emploi  
✅ **Type-safe** - TypeScript complet  
✅ **Animations** - UX moderne  
✅ **Documentation** - Guide complet  

**BNBGest peut maintenant accepter des paiements en ligne !** 💳✨
