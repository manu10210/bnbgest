'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'employee' | 'client';
}

export default function ProtectedRoute({ children, requiredRole = 'admin' }: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push('/login');
        return;
      }

      if (requiredRole && user?.role !== requiredRole) {
        // Rediriger vers une page d'accÃ¨s refusÃ© ou vers le dashboard appropriÃ©
        router.push('/login');
        return;
      }
    }
  }, [isAuthenticated, isLoading, user, requiredRole, router]);

  // Afficher un loader pendant la vÃ©rification
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f7f7f7] via-white to-[#f7f7f7] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF385C] mx-auto mb-4"></div>
          <p className="text-gray-600">VÃ©rification de l&apos;authentification...</p>
        </div>
      </div>
    );
  }

  // Si pas authentifiÃ© ou rÃ´le insuffisant, ne rien afficher (la redirection se fera)
  if (!isAuthenticated || (requiredRole && user?.role !== requiredRole)) {
    return null;
  }

  // Tout est OK, afficher le contenu protÃ©gÃ©
  return <>{children}</>;
}
