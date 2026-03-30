'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import toast, { Toaster } from 'react-hot-toast';

interface NotificationContextType {
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showInfo: (message: string) => void;
  showWarning: (message: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const showSuccess = (message: string) => {
    toast.success(message, {
      duration: 4000,
      style: {
        background: '#10B981',
        color: '#fff',
        borderRadius: '12px',
        fontSize: '14px',
        fontWeight: '500',
      },
    });
  };

  const showError = (message: string) => {
    toast.error(message, {
      duration: 5000,
      style: {
        background: '#EF4444',
        color: '#fff',
        borderRadius: '12px',
        fontSize: '14px',
        fontWeight: '500',
      },
    });
  };

  const showInfo = (message: string) => {
    toast(message, {
      duration: 4000,
      style: {
        background: '#3B82F6',
        color: '#fff',
        borderRadius: '12px',
        fontSize: '14px',
        fontWeight: '500',
      },
    });
  };

  const showWarning = (message: string) => {
    toast(message, {
      duration: 4000,
      icon: '⚠️',
      style: {
        background: '#F59E0B',
        color: '#fff',
        borderRadius: '12px',
        fontSize: '14px',
        fontWeight: '500',
      },
    });
  };

  return (
    <NotificationContext.Provider value={{ showSuccess, showError, showInfo, showWarning }}>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            borderRadius: '12px',
            fontSize: '14px',
          },
        }}
      />
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}