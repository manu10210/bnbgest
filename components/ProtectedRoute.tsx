'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'employee' | 'client';
}

export default function ProtectedRoute({ children, requiredRole = 'admin' }: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { data: session, status } = useSession();
  const router = useRouter();

  // Authentifié via NextAuth (Google OAuth) OU via AuthContext (credentials locaux)
  const nextAuthAuthenticated = status === 'authenticated' && !!session?.user;
  const nextAuthRole = (session?.user as { role?: string })?.role || 'admin';

  const isLoading = authLoading || status === 'loading';
  const isAuth = isAuthenticated || nextAuthAuthenticated;

  // Rôle effectif : NextAuth en priorité, sinon AuthContext
  const effectiveRole = nextAuthAuthenticated ? nextAuthRole : (user?.role || null);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuth) {
        router.push('/login');
        return;
      }
      if (requiredRole && effectiveRole !== requiredRole) {
        router.push('/login');
        return;
      }
    }
  }, [isAuth, isLoading, effectiveRole, requiredRole, router]);

  // Loader pendant vérification
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f7f7f7] via-white to-[#f7f7f7] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF385C] mx-auto mb-4"></div>
          <p className="text-gray-600">Vérification de l&apos;authentification...</p>
        </div>
      </div>
    );
  }

  // Non authentifié ou rôle insuffisant → null (redirection en cours)
  if (!isAuth || (requiredRole && effectiveRole !== requiredRole)) {
    return null;
  }

  return <>{children}</>;
}
