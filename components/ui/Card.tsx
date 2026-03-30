'use client';

import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import { useTheme } from '../../contexts/ThemeContext';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  delay?: number;
}

export function Card({ children, className, hover = true, delay = 0 }: CardProps) {
  const { isDark } = useTheme();
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay }}
      whileHover={hover ? { y: -2 } : undefined}
      className={cn(
        "rounded-xl border overflow-hidden transition-all duration-200",
        isDark
          ? "bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.06] hover:shadow-lg hover:shadow-black/20"
          : "bg-white border-[#ebebeb] shadow-[0_1px_2px_rgba(0,0,0,0.08)] hover:shadow-[0_2px_16px_rgba(0,0,0,0.12)]",
        className
      )}
    >
      {children}
    </motion.div>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
  delay?: number;
}

export function StatCard({ title, value, icon, trend, className, delay = 0 }: StatCardProps) {
  const { isDark } = useTheme();
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay }}
      className={cn(
        "rounded-xl p-6 border transition-all duration-200",
        isDark
          ? "bg-white/[0.04] border-white/[0.08]"
          : "bg-white border-[#ebebeb] shadow-[0_1px_2px_rgba(0,0,0,0.08)]",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className={cn("text-sm font-medium mb-1", isDark ? "text-gray-400" : "text-[#717171]")}>{title}</p>
          <p className={cn("text-3xl font-bold", isDark ? "text-white" : "text-[#222222]")}>{value}</p>
          {trend && (
            <div className={cn(
              "flex items-center mt-2 text-sm font-medium",
              trend.isPositive ? "text-green-600" : "text-red-600"
            )}>
              <span className={cn(
                "mr-1",
                trend.isPositive ? "text-green-500" : "text-red-500"
              )}>
                {trend.isPositive ? "↗" : "↘"}
              </span>
              {Math.abs(trend.value)}%
            </div>
          )}
        </div>
        <div className="text-4xl opacity-80">{icon}</div>
      </div>
    </motion.div>
  );
}