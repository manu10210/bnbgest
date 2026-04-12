import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import ProtectedRoute from '../../components/ProtectedRoute';
import AdminSkeleton from '../../components/skeletons/AdminSkeleton';

// Lazy load the heavy AdminDashboard component
const AdminDashboard = dynamic(() => import('../../components/AdminDashboard'), {
  ssr: true,
  loading: () => <AdminSkeleton />,
});

export default function AdminPage() {
  return (
    <ProtectedRoute requiredRole="admin">
      <Suspense fallback={<AdminSkeleton />}>
        <AdminDashboard />
      </Suspense>
    </ProtectedRoute>
  );
}