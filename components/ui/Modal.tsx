'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useTheme } from '../../contexts/ThemeContext';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function Modal({ isOpen, onClose, title, children, size = 'md', className }: ModalProps) {
  const { isDark } = useTheme();
  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className={cn(
                "rounded-3xl shadow-2xl w-full",
                sizes[size],
                "max-h-[90vh] overflow-hidden",
                isDark
                  ? "bg-[#222244] border border-white/[0.08]"
                  : "bg-white border border-[#ebebeb]",
                className
              )}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              {title && (
                <div className={cn(
                  "flex items-center justify-between p-6 border-b",
                  isDark ? "border-white/[0.08]" : "border-[#ebebeb]"
                )}>
                  <h3 className={cn("text-lg font-semibold", isDark ? "text-white" : "text-[#222222]")}>{title}</h3>
                  <button
                    onClick={onClose}
                    className={cn(
                      "transition-colors duration-200 p-2 rounded-full",
                      isDark ? "text-gray-400 hover:text-white hover:bg-white/10" : "text-[#717171] hover:text-[#222222] hover:bg-[#f7f7f7]"
                    )}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Content */}
              <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
                {children}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}