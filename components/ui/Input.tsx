'use client';

import { forwardRef, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import { LucideIcon } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface InputProps {
  label?: string;
  error?: string;
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  helperText?: string;
  type?: string;
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  disabled?: boolean;
  required?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, icon: Icon, iconPosition = 'left', helperText, ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false);
    const { isDark } = useTheme();

    return (
      <div className="space-y-1">
        {label && (
          <label className={cn("block text-sm font-medium", isDark ? "text-gray-300" : "text-[#222222]")}>
            {label}
          </label>
        )}

        <div className="relative">
          {Icon && iconPosition === 'left' && (
            <div className={cn("absolute left-3 top-1/2 transform -translate-y-1/2", isDark ? "text-gray-500" : "text-[#717171]")}>
              <Icon className="w-4 h-4" />
            </div>
          )}

          <motion.input
            ref={ref}
            className={cn(
              "w-full px-4 py-3 border rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:border-transparent",
              isDark
                ? "bg-white/[0.05] text-white placeholder-gray-500 border-white/[0.12] focus:ring-[#FF385C]/40"
                : "bg-white text-[#222222] placeholder-[#b0b0b0] border-[#b0b0b0] focus:ring-[#222222] focus:border-[#222222]",
              error
                ? "border-red-300 focus:ring-red-500"
                : isDark
                  ? "border-white/15 hover:border-white/25"
                  : "border-gray-300 hover:border-gray-400",
              Icon && iconPosition === 'left' && "pl-10",
              Icon && iconPosition === 'right' && "pr-10",
              isFocused && "shadow-lg",
              className
            )}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            {...props}
          />

          {Icon && iconPosition === 'right' && (
            <div className={cn("absolute right-3 top-1/2 transform -translate-y-1/2", isDark ? "text-gray-500" : "text-gray-400")}>
              <Icon className="w-4 h-4" />
            </div>
          )}
        </div>

        {error && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm text-red-600 flex items-center"
          >
            <span className="mr-1">âš ï¸</span>
            {error}
          </motion.p>
        )}

        {helperText && !error && (
          <p className={cn("text-sm", isDark ? "text-gray-500" : "text-gray-500")}>{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
