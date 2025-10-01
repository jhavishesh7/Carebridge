import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Calendar,
  Car,
  DollarSign,
  History,
  BarChart3,
  Users,
  Settings,
  Home,
  Plus,
  Clock,
} from 'lucide-react';

interface NavItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
  active?: boolean;
}

export function Sidebar() {
  const { profile } = useAuth();

  const location = useLocation();

  const getNavItems = (): NavItem[] => {
    switch (profile?.role) {
      case 'patient':
        return [
          { icon: Home, label: 'Dashboard', href: '/' },
          { icon: Plus, label: 'Book Appointment', href: '/book' },
          { icon: Calendar, label: 'My Appointments', href: '/appointments' },
          { icon: History, label: 'Ride History', href: '/rides' },
          { icon: Settings, label: 'Settings', href: '/settings' },
        ];
      case 'rider':
        return [
          { icon: Home, label: 'Dashboard', href: '/' },
          { icon: Car, label: 'Available Rides', href: '/' },
          { icon: Clock, label: 'Active Rides', href: '/' },
          { icon: History, label: 'Ride History', href: '/' },
          { icon: DollarSign, label: 'Earnings', href: '/' },
          { icon: Settings, label: 'Settings', href: '/settings' },
        ];
      case 'admin':
        return [
          { icon: Home, label: 'Dashboard', href: '/' },
          { icon: Users, label: 'Users', href: '/admin/users' },
          { icon: Settings, label: 'Settings', href: '/settings' },
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  return (
    <aside className="fixed left-0 top-16 h-screen w-64 bg-white border-r border-gray-200 overflow-y-auto">
      <nav className="p-4">
        <ul className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.label}>
                <Link
                  to={item.href}
                  className={`flex items-center space-x-3 px-3 py-3 rounded-lg font-medium transition-colors ${
                    location.pathname === item.href
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className={`h-5 w-5 ${location.pathname === item.href ? 'text-blue-700' : 'text-gray-500'}`} />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}