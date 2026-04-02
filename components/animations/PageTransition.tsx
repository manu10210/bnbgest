/**
 * Composant wrapper pour les animations de page
 * Ajoute automatiquement les animations de transition lors du changement de page
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ReactNode } from 'react';
import { pageTransition } from '@/lib/animations';

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

export function PageTransition({ children, className = '' }: PageTransitionProps) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageTransition}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Wrapper pour AnimatePresence avec configuration par défaut
 */
interface AnimatedPresenceProps {
  children: ReactNode;
  mode?: 'wait' | 'sync' | 'popLayout';
}

export function AnimatedPresence({ children, mode = 'wait' }: AnimatedPresenceProps) {
  return (
    <AnimatePresence mode={mode}>
      {children}
    </AnimatePresence>
  );
}
