import { useAuth } from '../../contexts/AuthContext';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface AuthGuardProps {
  children: React.ReactNode;
  role?: 'patient' | 'rider' | 'admin';
}

export function AuthGuard({ children, role }: AuthGuardProps) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user || !profile) {
    return null; // Will be handled by App component
  }

  if (role && profile.role !== role) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}