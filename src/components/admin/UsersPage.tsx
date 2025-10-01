import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Profile } from '../../lib/database.types';
import { LoadingSpinner } from '../ui/LoadingSpinner';

export function UsersPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setUsers(data || []);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-6"><LoadingSpinner /></div>;
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Users</h1>
      <div className="space-y-2">
        {users.map(u => (
          <div key={u.id} className="bg-white border border-gray-200 rounded-lg p-3 flex justify-between">
            <span>{u.full_name}</span>
            <span className="capitalize">{u.role}</span>
            <span>{new Date(u.created_at).toLocaleDateString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}


