import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { profile } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex">
        {profile && <Sidebar />}
        <main className={`flex-1 ${profile ? 'ml-64' : ''} transition-all duration-200`}>
          {children}
        </main>
      </div>
    </div>
  );
}