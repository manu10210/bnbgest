/**
 * Composants de liste animée avec effet stagger (cascade)
 */

'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';
import { listContainer, listItem } from '@/lib/animations';

interface AnimatedListProps {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
}

/**
 * Container de liste avec animation stagger
 */
export function AnimatedList({ children, className = '', staggerDelay = 0.05 }: AnimatedListProps) {
  return (
    <motion.ul
      initial="initial"
      animate="animate"
      exit="exit"
      variants={{
        ...listContainer,
        animate: {
          transition: {
            staggerChildren: staggerDelay,
            delayChildren: 0.1,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.ul>
  );
}

/**
 * Item de liste avec animation
 */
interface AnimatedListItemProps {
  children: ReactNode;
  className?: string;
}

export function AnimatedListItem({ children, className = '' }: AnimatedListItemProps) {
  return (
    <motion.li
      variants={listItem}
      className={className}
    >
      {children}
    </motion.li>
  );
}
