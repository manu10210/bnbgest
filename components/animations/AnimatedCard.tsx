/**
 * Composants de cartes animées réutilisables
 */

'use client';

import { motion, HTMLMotionProps } from 'framer-motion';
import { ReactNode } from 'react';
import { cardAnimation, buttonHover, buttonTap } from '@/lib/animations';

interface AnimatedCardProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  children: ReactNode;
  delay?: number;
  className?: string;
}

/**
 * Carte avec animation de fade + scale au montage
 */
export function AnimatedCard({ children, delay = 0, className = '', ...props }: AnimatedCardProps) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={cardAnimation}
      transition={{ delay }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/**
 * Bouton avec animation hover et tap
 */
interface AnimatedButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  children: ReactNode;
  className?: string;
}

export function AnimatedButton({ children, className = '', ...props }: AnimatedButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
      className={className}
      {...props}
    >
      {children}
    </motion.button>
  );
}

/**
 * Lien avec animation hover
 */
interface AnimatedLinkProps extends Omit<HTMLMotionProps<'a'>, 'children'> {
  children: ReactNode;
  className?: string;
  href: string;
}

export function AnimatedLink({ children, className = '', href, ...props }: AnimatedLinkProps) {
  return (
    <motion.a
      href={href}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={className}
      {...props}
    >
      {children}
    </motion.a>
  );
}

/**
 * Container pour grille d'éléments avec effet stagger
 */
interface AnimatedGridProps {
  children: ReactNode;
  className?: string;
  columns?: number;
}

export function AnimatedGrid({ children, className = '', columns = 3 }: AnimatedGridProps) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={{
        initial: {},
        animate: {
          transition: {
            staggerChildren: 0.1,
            delayChildren: 0.05,
          },
        },
      }}
      className={className}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: '1rem',
      }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Item de grille avec animation
 */
interface AnimatedGridItemProps {
  children: ReactNode;
  className?: string;
}

export function AnimatedGridItem({ children, className = '' }: AnimatedGridItemProps) {
  return (
    <motion.div
      variants={{
        initial: { opacity: 0, scale: 0.9 },
        animate: { 
          opacity: 1, 
          scale: 1,
          transition: {
            duration: 0.4,
            ease: 'easeOut',
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
