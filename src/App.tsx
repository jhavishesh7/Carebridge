import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { supabase } from './lib/supabase';
import { Layout } from './components/Layout';
import { BookAppointment } from './components/patient/BookAppointment';
import { AppointmentsPage } from './components/patient/AppointmentsPage';
import { AvailableRides } from './components/rider/AvailableRides';
import { ActiveRides } from './components/rider/ActiveRides';
import { EarningsPage } from './components/rider/EarningsPage';
import { UsersPage } from './components/admin/UsersPage';
import { LoginForm } from './components/auth/LoginForm';
import { SignupForm } from './components/auth/SignupForm';
import { AuthGuard } from './components/auth/AuthGuard';
import { PatientDashboard } from './components/dashboard/PatientDashboard';
import { RiderDashboard } from './components/dashboard/RiderDashboard';
import { AdminDashboard } from './components/dashboard/AdminDashboard';
import { LoadingSpinner } from './components/ui/LoadingSpinner';

function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center p-4">
      {isLogin ? (
        <LoginForm onToggleForm={() => setIsLogin(false)} />
      ) : (
        <SignupForm onToggleForm={() => setIsLogin(true)} />
      )}
    </div>
  );
}

function DashboardSelector() {
  const { profile } = useAuth();

  if (!profile) return null;

  switch (profile.role) {
    case 'patient':
      return <PatientDashboard />;
    case 'rider':
      return <RiderDashboard />;
    case 'admin':
      return <AdminDashboard />;
    default:
      return <div>Invalid role</div>;
  }
}

function AppContent() {
  const { user, profile, loading } = useAuth();
  const [profileSetupTimeout, setProfileSetupTimeout] = useState(false);

  // Add timeout for profile setup to prevent infinite loading
  useEffect(() => {
    if (user && !profile && !loading) {
      const timer = setTimeout(() => {
        setProfileSetupTimeout(true);
      }, 5000); // 5 second timeout

      return () => clearTimeout(timer);
    }
  }, [user, profile, loading]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  // If user exists but no profile after timeout, show error with retry option
  if (!profile && profileSetupTimeout) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="bg-white p-8 rounded-lg shadow-lg max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Profile Setup Required</h2>
            <p className="text-gray-600 mb-6">
              We couldn't find your profile. This might be because you signed up before the profile system was set up.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors mb-3"
            >
              Retry
            </button>
            <button
              onClick={() => {
                // Sign out and let user sign up again
                supabase.auth.signOut();
              }}
              className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Sign Out & Create New Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Still loading profile
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Setting up your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <Layout>
      <AuthGuard>
        <Routes>
          <Route path="/" element={<DashboardSelector />} />
          {/* Patient */}
          <Route path="/book" element={<BookAppointment />} />
          <Route path="/appointments" element={<AppointmentsPage />} />
          {/* Rider */}
          <Route path="/rider/available" element={<AvailableRides />} />
          <Route path="/rider/active" element={<ActiveRides />} />
          <Route path="/rider/earnings" element={<EarningsPage />} />
          {/* Admin */}
          <Route path="/admin/users" element={<UsersPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthGuard>
    </Layout>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;