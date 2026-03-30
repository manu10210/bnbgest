'use client';

import { useTheme } from '../contexts/ThemeContext';
import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function ThemeToggle({ className = '', size = 'md' }: ThemeToggleProps) {
  const { mode, toggleTheme } = useTheme();
  const isDark = mode === 'dark';

  const sizeClasses = {
    sm: 'w-12 h-6',
    md: 'w-14 h-7',
    lg: 'w-16 h-8',
  };

  const dotSizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const translateClasses = {
    sm: isDark ? 'translate-x-6' : 'translate-x-0.5',
    md: isDark ? 'translate-x-7' : 'translate-x-0.5',
    lg: isDark ? 'translate-x-8' : 'translate-x-0.5',
  };

  const iconSize = size === 'sm' ? 10 : size === 'md' ? 12 : 14;

  return (
    <button
      onClick={toggleTheme}
      className={`relative inline-flex items-center rounded-full transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#FF385C]/50 focus:ring-offset-2 focus:ring-offset-transparent ${sizeClasses[size]} ${
        isDark
          ? 'bg-[#FF385C] shadow-lg shadow-[#FF385C]/20'
          : 'bg-[#222222] shadow-lg shadow-black/10'
      } ${className}`}
      title={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
      aria-label={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
    >
      {/* Background icons */}
      <span className="absolute inset-0 flex items-center justify-between px-1.5 pointer-events-none">
        <Sun size={iconSize} className={`transition-opacity duration-300 ${isDark ? 'opacity-40 text-white' : 'opacity-0'}`} />
        <Moon size={iconSize} className={`transition-opacity duration-300 ${isDark ? 'opacity-0' : 'opacity-40 text-white'}`} />
      </span>

      {/* Dot */}
      <span
        className={`${dotSizeClasses[size]} rounded-full bg-white shadow-md transform transition-all duration-300 ease-in-out flex items-center justify-center ${translateClasses[size]}`}
      >
        {isDark ? (
          <Moon size={iconSize} className="text-[#222222]" />
        ) : (
          <Sun size={iconSize} className="text-amber-500" />
        )}
      </span>
    </button>
  );
}

