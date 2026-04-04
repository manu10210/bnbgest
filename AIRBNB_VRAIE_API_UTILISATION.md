# Démarrage Rapide : Utilisation de la Vraie API Airbnb

Vous avez décidé d'utiliser directement la **Vraie API Airbnb**.
Dans le code, le service client est déjà construit (`lib/airbnb-api.ts`) pour faire cela. Il contient toutes les fonctions pour créer, mettre à jour, récupérer les annonces et modifier les prix / calendriers.

### 1. Activer votre application sur le portail Airbnb
Pour utiliser ce service, vous devez avoir un compte de partenaire Airbnb et déclarer votre application pour obtenir vos clés d'API.

Allez sur le portail partenaire d'Airbnb et récupérez :
- Le `Client ID`
- Le `Client Secret`

### 2. Variables d'Environnement
Ajoutez ces variables dans le fichier `.env` de votre projet :

```env
AIRBNB_CLIENT_ID=votre_client_id
AIRBNB_CLIENT_SECRET=votre_client_secret
AIRBNB_REDIRECT_URI=http://localhost:3000/api/auth/airbnb/callback
# ou votre URL en production : https://votre-site.com/api/auth/airbnb/callback
```

### 3. Comment utiliser les Annonces dans le code

Le fichier `lib/airbnb-api.ts` contient déjà les différentes méthodes de requêtage direct :

```typescript
import { AirbnbAPIClient } from '@/lib/airbnb-api';

// Initialisez le client avec les crédentiels
const airbnbClient = new AirbnbAPIClient({
  clientId: process.env.AIRBNB_CLIENT_ID,
  clientSecret: process.env.AIRBNB_CLIENT_SECRET,
  redirectUri: process.env.AIRBNB_REDIRECT_URI,
});

// Récupérer vos annonces :
const response = await airbnbClient.getListings({ limit: 10 });
console.log(response.listings);

// Créer une annonce directement depuis votre back-office :
const newListing = await airbnbClient.createListing({
  name: "Mon super appartement",
  property_type: "Apartment",
  // ...
});
```

---

**Ce que nous venons de confirmer :**
Le code de base pour interagir avec **les vraies annonces (listings) Airbnb** est déjà implémenté via `lib/airbnb-api.ts`. Il ne manque que les accès officiels (Client ID/Secret) !