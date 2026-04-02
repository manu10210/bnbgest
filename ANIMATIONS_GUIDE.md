# 🎬 Animations avec Framer Motion - BNBGest

## 📋 Vue d'ensemble

Système d'animations complet utilisant **Framer Motion** pour améliorer l'expérience utilisateur de BNBGest avec des transitions fluides et professionnelles.

## 🎨 Composants disponibles

### 1. **PageTransition** - Transitions de page
```tsx
import { PageTransition } from '@/components/animations';

export default function MaPage() {
  return (
    <PageTransition>
      <div>Contenu de la page</div>
    </PageTransition>
  );
}
```

### 2. **AnimatedCard** - Cartes animées
```tsx
import { AnimatedCard } from '@/components/animations';

<AnimatedCard delay={0.1}>
  <div className="p-6 bg-white rounded-lg shadow">
    Contenu de la carte
  </div>
</AnimatedCard>
```

### 3. **AnimatedButton** - Boutons interactifs
```tsx
import { AnimatedButton } from '@/components/animations';

<AnimatedButton className="px-4 py-2 bg-blue-500 text-white rounded">
  Cliquez-moi
</AnimatedButton>
```

### 4. **AnimatedGrid** - Grille avec effet stagger
```tsx
import { AnimatedGrid, AnimatedGridItem } from '@/components/animations';

<AnimatedGrid columns={3}>
  {items.map(item => (
    <AnimatedGridItem key={item.id}>
      <Card {...item} />
    </AnimatedGridItem>
  ))}
</AnimatedGrid>
```

### 5. **AnimatedList** - Listes avec effet cascade
```tsx
import { AnimatedList, AnimatedListItem } from '@/components/animations';

<AnimatedList staggerDelay={0.1}>
  {items.map(item => (
    <AnimatedListItem key={item.id}>
      {item.name}
    </AnimatedListItem>
  ))}
</AnimatedList>
```

### 6. **AnimatedModal** - Modals élégants
```tsx
import { AnimatedModal } from '@/components/animations';

const [isOpen, setIsOpen] = useState(false);

<AnimatedModal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Mon Modal"
  size="lg"
>
  <p>Contenu du modal</p>
</AnimatedModal>
```

**Tailles disponibles :** `sm` | `md` | `lg` | `xl` | `full`

**Fonctionnalités :**
- ✅ Fermeture avec `Escape`
- ✅ Fermeture en cliquant sur le backdrop
- ✅ Blocage du scroll
- ✅ Animations fluides

### 7. **Loaders animés**

#### AnimatedSpinner
```tsx
import { AnimatedSpinner } from '@/components/animations';

<AnimatedSpinner size="md" color="#FF385C" />
```

#### AnimatedDots
```tsx
import { AnimatedDots } from '@/components/animations';

<AnimatedDots />
```

#### AnimatedProgressBar
```tsx
import { AnimatedProgressBar } from '@/components/animations';

<AnimatedProgressBar progress={75} color="#FF385C" />
```

#### AnimatedSkeleton
```tsx
import { AnimatedSkeleton } from '@/components/animations';

<AnimatedSkeleton width="200px" height="20px" />
<AnimatedSkeleton width="50px" height="50px" circle />
```

#### AnimatedPulseIndicator
```tsx
import { AnimatedPulseIndicator } from '@/components/animations';

<AnimatedPulseIndicator color="#FF385C" size="12px" />
```

#### AnimatedBounceLoader
```tsx
import { AnimatedBounceLoader } from '@/components/animations';

<AnimatedBounceLoader />
```

## 🎯 Variantes d'animation disponibles

Importez depuis `@/lib/animations` :

```tsx
import {
  fadeInUp,
  fadeInDown,
  fadeInLeft,
  fadeInRight,
  scaleIn,
  cardAnimation,
  listContainer,
  listItem,
  modalBackdrop,
  modalContent,
  slideInRight,
  rotate,
  pulse,
  bounce,
  pageTransition,
  gridContainer,
  gridItem,
  flip,
} from '@/lib/animations';
```

### Utilisation personnalisée

```tsx
import { motion } from 'framer-motion';
import { fadeInUp } from '@/lib/animations';

<motion.div
  initial="initial"
  animate="animate"
  exit="exit"
  variants={fadeInUp}
>
  Contenu animé
</motion.div>
```

## 📱 Exemples d'intégration

### Dashboard avec cartes animées
```tsx
import { AnimatedGrid, AnimatedGridItem } from '@/components/animations';

export default function Dashboard() {
  return (
    <AnimatedGrid columns={3} className="gap-6">
      <AnimatedGridItem>
        <StatsCard title="Réservations" value={42} />
      </AnimatedGridItem>
      <AnimatedGridItem>
        <StatsCard title="Revenus" value="12 500 €" />
      </AnimatedGridItem>
      <AnimatedGridItem>
        <StatsCard title="Propriétés" value={8} />
      </AnimatedGridItem>
    </AnimatedGrid>
  );
}
```

### Liste de propriétés avec effet cascade
```tsx
import { AnimatedList, AnimatedListItem } from '@/components/animations';

export default function PropertyList({ properties }) {
  return (
    <AnimatedList staggerDelay={0.08}>
      {properties.map(property => (
        <AnimatedListItem key={property.id}>
          <PropertyCard property={property} />
        </AnimatedListItem>
      ))}
    </AnimatedList>
  );
}
```

### Formulaire avec animations
```tsx
import { AnimatedCard } from '@/components/animations';
import { motion } from 'framer-motion';

export default function BookingForm() {
  return (
    <AnimatedCard delay={0.2}>
      <form className="space-y-4">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <input type="text" placeholder="Nom" />
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <input type="email" placeholder="Email" />
        </motion.div>
        
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="btn-primary"
        >
          Réserver
        </motion.button>
      </form>
    </AnimatedCard>
  );
}
```

### Modal de confirmation
```tsx
import { AnimatedModal, AnimatedButton } from '@/components/animations';

export default function DeleteConfirmation() {
  const [isOpen, setIsOpen] = useState(false);

  const handleDelete = async () => {
    await deleteItem();
    setIsOpen(false);
  };

  return (
    <>
      <AnimatedButton onClick={() => setIsOpen(true)}>
        Supprimer
      </AnimatedButton>

      <AnimatedModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Confirmer la suppression"
        size="sm"
      >
        <p className="mb-4">Êtes-vous sûr de vouloir supprimer cet élément ?</p>
        <div className="flex gap-2 justify-end">
          <AnimatedButton onClick={() => setIsOpen(false)}>
            Annuler
          </AnimatedButton>
          <AnimatedButton onClick={handleDelete} className="bg-red-500">
            Supprimer
          </AnimatedButton>
        </div>
      </AnimatedModal>
    </>
  );
}
```

### Page de chargement
```tsx
import { AnimatedSpinner, AnimatedSkeleton } from '@/components/animations';

export default function LoadingPage() {
  return (
    <div className="space-y-4">
      <div className="flex justify-center py-8">
        <AnimatedSpinner size="lg" />
      </div>
      
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="space-y-2">
            <AnimatedSkeleton height="200px" />
            <AnimatedSkeleton height="20px" width="80%" />
            <AnimatedSkeleton height="20px" width="60%" />
          </div>
        ))}
      </div>
    </div>
  );
}
```

## 🎨 Personnalisation

### Créer vos propres animations

```tsx
import { motion } from 'framer-motion';

const customVariant = {
  initial: {
    opacity: 0,
    rotate: -180,
    scale: 0.5,
  },
  animate: {
    opacity: 1,
    rotate: 0,
    scale: 1,
    transition: {
      duration: 0.8,
      ease: [0.6, -0.05, 0.01, 0.99],
    },
  },
};

<motion.div variants={customVariant} initial="initial" animate="animate">
  Animation personnalisée
</motion.div>
```

### Animations au scroll (Intersection Observer)

```tsx
import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';

export function ScrollReveal({ children }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
      transition={{ duration: 0.5 }}
    >
      {children}
    </motion.div>
  );
}
```

### Animations de layout (Layout animations)

```tsx
import { motion } from 'framer-motion';

<motion.div layout className="card">
  {/* Le contenu avec layout automatique */}
</motion.div>
```

## ⚡ Performance

### Bonnes pratiques

1. **Utilisez `transform` et `opacity`** - GPU-accéléré
   ```tsx
   // ✅ Bon - GPU accéléré
   animate={{ x: 100, opacity: 0.5 }}
   
   // ❌ Éviter - Déclenche reflow
   animate={{ left: 100, width: '50%' }}
   ```

2. **Désactivez les animations sur mobile si nécessaire**
   ```tsx
   const isMobile = useMediaQuery('(max-width: 768px)');
   
   <motion.div animate={isMobile ? {} : { x: 100 }}>
     Contenu
   </motion.div>
   ```

3. **Utilisez `will-change` pour les animations complexes**
   ```tsx
   <motion.div style={{ willChange: 'transform' }}>
     Animation complexe
   </motion.div>
   ```

4. **Lazy load les animations lourdes**
   ```tsx
   const HeavyAnimation = lazy(() => import('./HeavyAnimation'));
   ```

## 🎯 Cas d'usage recommandés

| Composant | Cas d'usage |
|-----------|-------------|
| `PageTransition` | Transitions entre pages |
| `AnimatedCard` | Cards, widgets, panels |
| `AnimatedButton` | Boutons, CTA |
| `AnimatedGrid` | Galeries, dashboards |
| `AnimatedList` | Listes de résultats, menus |
| `AnimatedModal` | Dialogs, popups |
| `AnimatedSpinner` | Chargement global |
| `AnimatedDots` | Chargement inline |
| `AnimatedProgressBar` | Upload, steps |
| `AnimatedSkeleton` | Placeholders de contenu |
| `AnimatedPulseIndicator` | Notifications, badges |

## 🐛 Dépannage

### Les animations ne fonctionnent pas
- Vérifiez que Framer Motion est installé : `npm list framer-motion`
- Assurez-vous d'utiliser `'use client'` en haut des composants
- Vérifiez la console pour les erreurs

### Animations saccadées
- Utilisez `transform` au lieu de `left/top/width/height`
- Réduisez le nombre d'animations simultanées
- Utilisez `will-change: transform` si nécessaire

### AnimatePresence ne fonctionne pas
- Assurez-vous que chaque enfant a une `key` unique
- Utilisez `mode="wait"` pour des transitions séquentielles

## 📚 Ressources

- [Documentation Framer Motion](https://www.framer.com/motion/)
- [Exemples d'animations](https://www.framer.com/motion/examples/)
- [API Reference](https://www.framer.com/motion/component/)

## ✅ Checklist d'intégration

- [ ] Installer Framer Motion : `npm install framer-motion`
- [ ] Importer les composants nécessaires
- [ ] Ajouter `PageTransition` aux pages principales
- [ ] Remplacer les cartes statiques par `AnimatedCard`
- [ ] Utiliser `AnimatedButton` pour les CTA
- [ ] Ajouter `AnimatedModal` pour les dialogs
- [ ] Intégrer les loaders dans les états de chargement
- [ ] Tester les performances sur mobile
- [ ] Documenter les animations personnalisées

## 🎉 Résultat

Avec ce système d'animations :
- ✅ UX moderne et fluide
- ✅ Composants réutilisables
- ✅ Performance optimisée
- ✅ Facile à maintenir
- ✅ Cohérence visuelle
