'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

export interface Theme {
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  success: string;
  warning: string;
  error: string;
  info: string;
}

export interface CustomizationSettings {
  theme: Theme;
  fontSize: 'small' | 'medium' | 'large';
  language: 'fr' | 'en';
  layout: 'compact' | 'comfortable' | 'spacious';
  animations: boolean;
  notifications: boolean;
  autoSave: boolean;
  dashboardWidgets: string[];
  sidebarCollapsed: boolean;
}

const defaultThemes: { [key: string]: Theme } = {
  default: {
    name: 'Défaut',
    primary: 'rose',
    secondary: 'purple',
    accent: 'pink',
    background: 'slate-50',
    surface: 'white',
    text: 'gray-900',
    textSecondary: 'slate-600',
    border: 'slate-200',
    success: 'green',
    warning: 'yellow',
    error: 'red',
    info: 'blue'
  },
  dark: {
    name: 'Sombre',
    primary: 'slate',
    secondary: 'gray',
    accent: 'rose',
    background: 'gray-900',
    surface: 'gray-800',
    text: 'slate-100',
    textSecondary: 'slate-400',
    border: 'slate-700',
    success: 'green',
    warning: 'yellow',
    error: 'red',
    info: 'blue'
  },
  nature: {
    name: 'Nature',
    primary: 'emerald',
    secondary: 'teal',
    accent: 'lime',
    background: 'emerald-50',
    surface: 'white',
    text: 'emerald-900',
    textSecondary: 'emerald-600',
    border: 'emerald-200',
    success: 'green',
    warning: 'yellow',
    error: 'red',
    info: 'blue'
  },
  sunset: {
    name: 'Coucher de soleil',
    primary: 'orange',
    secondary: 'red',
    accent: 'yellow',
    background: 'orange-50',
    surface: 'white',
    text: 'orange-900',
    textSecondary: 'orange-600',
    border: 'orange-200',
    success: 'green',
    warning: 'yellow',
    error: 'red',
    info: 'blue'
  },
  ocean: {
    name: 'Océan',
    primary: 'cyan',
    secondary: 'blue',
    accent: 'rose',
    background: 'cyan-50',
    surface: 'white',
    text: 'cyan-900',
    textSecondary: 'cyan-600',
    border: 'cyan-200',
    success: 'green',
    warning: 'yellow',
    error: 'red',
    info: 'blue'
  }
};

const defaultSettings: CustomizationSettings = {
  theme: defaultThemes.default,
  fontSize: 'medium',
  language: 'fr',
  layout: 'comfortable',
  animations: true,
  notifications: true,
  autoSave: true,
  dashboardWidgets: ['stats', 'tasks', 'properties', 'calendar'],
  sidebarCollapsed: false
};

interface CustomizationContextType {
  settings: CustomizationSettings;
  themes: { [key: string]: Theme };
  updateSettings: (newSettings: Partial<CustomizationSettings>) => void;
  updateTheme: (themeKey: string) => void;
  resetToDefaults: () => void;
  getThemeClasses: () => {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    success: string;
    warning: string;
    error: string;
    info: string;
  };
  hasUnsavedChanges: boolean;
  saveChanges: () => void;
}

const CustomizationContext = createContext<CustomizationContextType | undefined>(undefined);

export function CustomizationProvider({ children }: { children: ReactNode }) {
  const [themes] = useState<{ [key: string]: Theme }>(defaultThemes);

  // �?tat initial calculé pour éviter les appels setState dans useEffect
  const getInitialSettings = () => {
    if (typeof window === 'undefined') return defaultSettings;
    try {
      const savedSettings = localStorage.getItem('bnbgest_customization');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        // Assurer que le thème est un objet complet, pas juste une clé
        if (typeof parsed.theme === 'string') {
          parsed.theme = themes[parsed.theme] || defaultThemes.default;
        }
        return { ...defaultSettings, ...parsed };
      }
    } catch (error) {
      console.error('Erreur lors du chargement des paramètres:', error);
    }
    return defaultSettings;
  };

  const [settings, setSettings] = useState<CustomizationSettings>(getInitialSettings);
  const [originalSettings, setOriginalSettings] = useState<CustomizationSettings>(defaultSettings);

  const updateSettings = (newSettings: Partial<CustomizationSettings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);

    // Sauvegarder dans localStorage seulement si autoSave est activé
    if (settings.autoSave) {
      const settingsToSave = {
        ...updatedSettings,
        theme: updatedSettings.theme.name.toLowerCase().replace(/\s+/g, '') // Sauvegarder seulement le nom du thème
      };
      localStorage.setItem('bnbgest_customization', JSON.stringify(settingsToSave));
      setOriginalSettings(updatedSettings); // Mettre à jour les paramètres originaux
    }
  };

  const saveChanges = () => {
    const settingsToSave = {
      ...settings,
      theme: settings.theme.name.toLowerCase().replace(/\s+/g, '')
    };
    localStorage.setItem('bnbgest_customization', JSON.stringify(settingsToSave));
    setOriginalSettings(settings);
  };

  const hasUnsavedChanges = JSON.stringify(settings) !== JSON.stringify(originalSettings);

  const updateTheme = (themeKey: string) => {
    const newTheme = themes[themeKey];
    if (newTheme) {
      updateSettings({ theme: newTheme });
    }
  };

  const resetToDefaults = () => {
    setSettings(defaultSettings);
    localStorage.removeItem('bnbgest_customization');
  };

  const getThemeClasses = () => {
    const theme = settings.theme;
    return {
      primary: `bg-${theme.primary}-500 text-${theme.primary}-50 border-${theme.primary}-500`,
      secondary: `bg-${theme.secondary}-500 text-${theme.secondary}-50 border-${theme.secondary}-500`,
      accent: `bg-${theme.accent}-500 text-${theme.accent}-50 border-${theme.accent}-500`,
      background: `bg-${theme.background}`,
      surface: `bg-${theme.surface}`,
      text: `text-${theme.text}`,
      textSecondary: `text-${theme.textSecondary}`,
      border: `border-${theme.border}`,
      success: `bg-${theme.success}-500 text-${theme.success}-50 border-${theme.success}-500`,
      warning: `bg-${theme.warning}-500 text-${theme.warning}-50 border-${theme.warning}-500`,
      error: `bg-${theme.error}-500 text-${theme.error}-50 border-${theme.error}-500`,
      info: `bg-${theme.info}-500 text-${theme.info}-50 border-${theme.info}-500`
    };
  };

  const value = {
    settings,
    themes,
    updateSettings,
    updateTheme,
    resetToDefaults,
    getThemeClasses,
    hasUnsavedChanges,
    saveChanges
  };

  return (
    <CustomizationContext.Provider value={value}>
      {children}
    </CustomizationContext.Provider>
  );
}

export function useCustomization() {
  const context = useContext(CustomizationContext);
  if (context === undefined) {
    throw new Error('useCustomization must be used within a CustomizationProvider');
  }
  return context;
}
