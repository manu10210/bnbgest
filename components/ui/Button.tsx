'use client';

import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import { LucideIcon } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  fullWidth?: boolean;
  children?: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  className?: string;
  title?: string;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconPosition = 'left',
  loading = false,
  fullWidth = false,
  className,
  disabled,
  ...props
}: ButtonProps) {
  const { isDark } = useTheme();
  const baseClasses = "relative inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

  const variants = {
    primary: "bg-[#FF385C] text-white hover:bg-[#E31C5F] focus:ring-[#FF385C] shadow-sm hover:shadow-md",
    secondary: isDark
      ? "bg-white/[0.08] text-gray-200 hover:bg-white/[0.12] focus:ring-gray-500 border border-white/[0.08]"
      : "bg-[#f7f7f7] text-[#222222] hover:bg-[#ebebeb] focus:ring-gray-400 border border-[#dddddd]",
    outline: isDark
      ? "border border-white/[0.15] text-gray-300 hover:border-white/30 hover:bg-white/[0.04] focus:ring-[#FF385C]"
      : "border border-[#222222] text-[#222222] hover:bg-[#f7f7f7] focus:ring-[#FF385C]",
    ghost: isDark
      ? "text-gray-400 hover:text-white hover:bg-white/[0.06] focus:ring-[#FF385C]"
      : "text-[#717171] hover:text-[#222222] hover:bg-[#f7f7f7] focus:ring-[#FF385C]",
    danger: "bg-[#C13515] text-white hover:bg-[#A52B12] focus:ring-[#C13515] shadow-sm hover:shadow-md",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg",
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        baseClasses,
        variants[variant],
        sizes[size],
        fullWidth && "w-full",
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"
        />
      )}

      {!loading && Icon && iconPosition === 'left' && (
        <Icon className="w-4 h-4 mr-2" />
      )}

      <span className={loading ? "opacity-70" : ""}>{children}</span>

      {!loading && Icon && iconPosition === 'right' && (
        <Icon className="w-4 h-4 ml-2" />
      )}
    </motion.button>
  );
}