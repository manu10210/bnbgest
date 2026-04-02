/**
 * Indicateurs de chargement animés
 */

'use client';

import { motion } from 'framer-motion';
import { rotate, bounce, pulse } from '@/lib/animations';

/**
 * Spinner rotatif classique
 */
interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
}

export function AnimatedSpinner({ size = 'md', color = 'currentColor' }: SpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  };

  return (
    <motion.div
      variants={rotate}
      animate="animate"
      className={`${sizeClasses[size]} border-t-transparent rounded-full`}
      style={{ borderColor: color }}
    />
  );
}

/**
 * Dots pulsants (3 points)
 */
export function AnimatedDots() {
  return (
    <div className="flex gap-1">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          animate={{
            y: [0, -10, 0],
          }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: i * 0.1,
          }}
          className="w-2 h-2 bg-current rounded-full"
        />
      ))}
    </div>
  );
}

/**
 * Barre de progression animée
 */
interface ProgressBarProps {
  progress: number; // 0-100
  color?: string;
  height?: string;
  animated?: boolean;
}

export function AnimatedProgressBar({
  progress,
  color = '#FF385C',
  height = '8px',
  animated = true,
}: ProgressBarProps) {
  return (
    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden" style={{ height }}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        transition={animated ? { duration: 0.5, ease: 'easeOut' } : { duration: 0 }}
        className="h-full rounded-full"
        style={{ backgroundColor: color }}
      />
    </div>
  );
}

/**
 * Skeleton loader avec effet shimmer
 */
interface SkeletonProps {
  width?: string;
  height?: string;
  className?: string;
  circle?: boolean;
}

export function AnimatedSkeleton({ width = '100%', height = '20px', className = '', circle = false }: SkeletonProps) {
  return (
    <motion.div
      animate={{
        backgroundPosition: ['200% 0', '-200% 0'],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: 'linear',
      }}
      className={`bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 ${
        circle ? 'rounded-full' : 'rounded'
      } ${className}`}
      style={{
        width,
        height,
        backgroundSize: '200% 100%',
      }}
    />
  );
}

/**
 * Pulse indicator (pour notifications)
 */
interface PulseIndicatorProps {
  color?: string;
  size?: string;
}

export function AnimatedPulseIndicator({ color = '#FF385C', size = '12px' }: PulseIndicatorProps) {
  return (
    <div className="relative inline-flex">
      <motion.span
        variants={pulse}
        animate="animate"
        className="absolute inline-flex h-full w-full rounded-full opacity-75"
        style={{ backgroundColor: color }}
      />
      <span
        className="relative inline-flex rounded-full"
        style={{ backgroundColor: color, width: size, height: size }}
      />
    </div>
  );
}

/**
 * Bounce loader (3 balles qui rebondissent)
 */
export function AnimatedBounceLoader() {
  return (
    <div className="flex gap-2 items-end h-8">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          animate={{
            y: ['0%', '-100%', '0%'],
          }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: i * 0.1,
            ease: 'easeInOut',
          }}
          className="w-2 h-2 bg-[#FF385C] rounded-full"
        />
      ))}
    </div>
  );
}
