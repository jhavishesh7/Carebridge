import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Bell, User, LogOut, Settings, Heart, Shield } from 'lucide-react';

export function Header() {
  const { profile, signOut, updateRole } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 relative z-50">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-green-600 rounded-lg flex items-center justify-center">
              <Heart className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">CareBridge</h1>
              <p className="text-xs text-gray-500">Healthcare Mobility</p>
            </div>
          </div>

          {/* Right side */}
          {profile && (
            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <button className="p-2 text-gray-400 hover:text-gray-600 relative">
                <Bell className="h-6 w-6" />
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  3
                </span>
              </button>

              {/* User dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-gray-900">{profile.full_name}</p>
                    <p className="text-xs text-gray-500 capitalize">{profile.role}</p>
                  </div>
                </button>

                {showDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
                    <div className="px-4 py-2 text-xs text-gray-500">Role</div>
                    <button
                      onClick={async () => { setShowDropdown(false); await updateRole('patient'); }}
                      className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                    >
                      <Shield className="h-4 w-4" />
                      <span>Patient</span>
                    </button>
                    <button
                      onClick={async () => { setShowDropdown(false); await updateRole('rider'); }}
                      className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                    >
                      <Shield className="h-4 w-4" />
                      <span>Rider</span>
                    </button>
                    <button
                      onClick={async () => { setShowDropdown(false); await updateRole('admin'); }}
                      className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                    >
                      <Shield className="h-4 w-4" />
                      <span>Admin</span>
                    </button>
                    <hr className="my-1" />
                    <button
                      onClick={() => setShowDropdown(false)}
                      className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                    >
                      <Settings className="h-4 w-4" />
                      <span>Settings</span>
                    </button>
                    <hr className="my-1" />
                    <button
                      onClick={handleSignOut}
                      className="flex items-center space-x-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}