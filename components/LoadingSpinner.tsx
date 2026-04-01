'use client';

import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  text?: string;
  fullScreen?: boolean;
  overlay?: boolean;
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
  xl: 'w-16 h-16',
};

export function LoadingSpinner({ 
  size = 'md', 
  text, 
  fullScreen = false,
  overlay = false 
}: LoadingSpinnerProps) {
  const content = (
    <div className={`flex flex-col items-center justify-center gap-3 ${
      fullScreen ? 'min-h-screen' : 'min-h-[200px]'
    }`}>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      >
        <Loader2 className={`${sizeClasses[size]} text-blue-600 dark:text-blue-400`} />
      </motion.div>
      {text && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm text-gray-600 dark:text-gray-400"
        >
          {text}
        </motion.p>
      )}
    </div>
  );

  if (overlay) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-2xl">
          {content}
        </div>
      </div>
    );
  }

  return content;
}

export function LoadingCard() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm animate-pulse">
      <div className="space-y-4">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>
    </div>
  );
}

export function LoadingTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden">
      <div className="animate-pulse">
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-700 p-4">
          <div className="flex gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 dark:bg-gray-700 rounded flex-1"></div>
            ))}
          </div>
        </div>
        {/* Rows */}
        {[...Array(rows)].map((_, i) => (
          <div key={i} className="border-b border-gray-200 dark:border-gray-700 p-4">
            <div className="flex gap-4">
              {[...Array(4)].map((_, j) => (
                <div key={j} className="h-4 bg-gray-100 dark:bg-gray-700/50 rounded flex-1"></div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function LoadingGrid({ items = 6 }: { items?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(items)].map((_, i) => (
        <LoadingCard key={i} />
      ))}
    </div>
  );
}
