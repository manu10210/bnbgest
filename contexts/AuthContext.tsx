'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'employee' | 'client';
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Utilisateurs de test (en production, ceci serait dans une base de données)
const USERS = [
  {
    id: 1,
    email: 'claustre.emmanuel@gmail.com',
    password: 'admin123', // En production, utiliser un hash sécurisé
    name: 'Emmanuel Claustre',
    role: 'admin' as const,
    avatar: 'EC'
  },
  {
    id: 2,
    email: 'employee@bnbgest.com',
    password: 'emp123',
    name: 'Employé Test',
    role: 'employee' as const,
    avatar: 'ET'
  }
];

export function AuthProvider({ children }: { children: ReactNode }) {
  // État initial sécurisé pour SSR
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true); // FIXÉ: true au démarrage

  // Charger l'utilisateur depuis localStorage côté client uniquement
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedUser = localStorage.getItem('bnbgest_user');
        if (savedUser) {
          setUser(JSON.parse(savedUser));
        }
      } catch (error) {
        console.warn('Erreur lors du chargement de l\'utilisateur:', error);
        localStorage.removeItem('bnbgest_user');
      } finally {
        setIsLoading(false); // FIXÉ: fin du chargement
      }
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);

    // Simulation d'un délai réseau
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Recherche de l'utilisateur
    const foundUser = USERS.find(u => u.email === email && u.password === password);

    if (foundUser) {
      const { password: _password, ...userWithoutPassword } = foundUser;
      setUser(userWithoutPassword);
      localStorage.setItem('bnbgest_user', JSON.stringify(userWithoutPassword));
      setIsLoading(false);
      return true;
    }

    setIsLoading(false);
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('bnbgest_user');
  };

  const value = {
    user,
    login,
    logout,
    isLoading,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}