'use client';

import React, { ReactNode } from 'react';
import { useCustomization } from '../contexts/CustomizationContext';

interface ThemeWrapperProps {
  children: ReactNode;
}

export default function ThemeWrapper({ children }: ThemeWrapperProps) {
  const { settings } = useCustomization();

  return (
    <div
      className={`
        ${settings.animations ? 'transition-all duration-300' : ''}
        ${settings.fontSize === 'small' ? 'text-sm' : ''}
        ${settings.fontSize === 'large' ? 'text-lg' : ''}
        ${settings.layout === 'compact' ? 'space-y-2' : ''}
        ${settings.layout === 'spacious' ? 'space-y-8' : ''}
      `}
      style={{
        fontSize: settings.fontSize === 'small' ? '14px' :
                 settings.fontSize === 'large' ? '18px' : '16px'
      }}
    >
      {children}
    </div>
  );
}