import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Earning } from '../../lib/database.types';
import { useAuth } from '../../contexts/AuthContext';
import { LoadingSpinner } from '../ui/LoadingSpinner';

export function EarningsPage() {
  const { profile } = useAuth();
  const [items, setItems] = useState<Earning[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, [profile?.id]);

  const load = async () => {
    if (!profile) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('earnings')
        .select('*')
        .eq('rider_id', profile.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setItems(data || []);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-6"><LoadingSpinner /></div>;
  const total = items.reduce((s, e) => s + e.net_amount, 0);
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Earnings</h1>
      <div className="mb-4 font-semibold">Total: Rs. {total.toFixed(2)}</div>
      {items.length === 0 ? (
        <div className="text-gray-500">No earnings yet.</div>
      ) : (
        <div className="space-y-2">
          {items.map(e => (
            <div key={e.id} className="bg-white border border-gray-200 rounded-lg p-3 flex justify-between">
              <span>Ride: {e.ride_id}</span>
              <span>Net: Rs. {e.net_amount.toFixed(2)}</span>
              <span>Status: {e.payment_status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


