import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Bell, User, LogOut, Settings, Heart } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Modal } from './ui/Modal';

export function Header() {
  const { profile, signOut } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<Array<{ id: string; title: string; message: string; is_read: boolean; created_at: string }>>([]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load notifications
  useEffect(() => {
    const load = async () => {
      if (!profile) return;
      const { data } = await supabase
        .from('notifications')
        .select('id,title,message,is_read,created_at')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(20);
      setNotifications(data || []);
    };
    load();
    if (!profile) return;
    const channel = supabase
      .channel('realtime:notifications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${profile.id}` }, () => {
        load();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile?.id]);

  const unread = useMemo(() => notifications.filter(n => !n.is_read).length, [notifications]);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <>
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
              <button onClick={() => setNotifOpen(true)} className="p-2 text-gray-400 hover:text-gray-600 relative">
                <Bell className="h-6 w-6" />
                {unread > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {unread}
                  </span>
                )}
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
    <Modal open={notifOpen} title="Notifications" onClose={() => setNotifOpen(false)}>
      {notifications.length === 0 ? (
        <div className="text-gray-600">No notifications</div>
      ) : (
        <div className="space-y-3">
          {notifications.map(n => (
            <div key={n.id} className="border-b pb-2">
              <div className="text-sm font-semibold text-gray-900">{n.title}</div>
              <div className="text-sm text-gray-700">{n.message}</div>
              <div className="text-xs text-gray-400 mt-1">{new Date(n.created_at).toLocaleString()}</div>
            </div>
          ))}
        </div>
      )}
    </Modal>
    </>
  );
}