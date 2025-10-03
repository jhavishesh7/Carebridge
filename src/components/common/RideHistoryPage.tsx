import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import type { Ride } from '../../lib/database.types';
import { LoadingSpinner } from '../ui/LoadingSpinner';

export function RideHistoryPage() {
  const { profile } = useAuth();
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!profile) return;
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('rides')
          .select('*')
          .or(`patient_id.eq.${profile.id},rider_id.eq.${profile.id}`)
          .order('created_at', { ascending: false });
        if (error) throw error;
        setRides(data || []);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [profile?.id]);

  if (loading) return <div className="p-6"><LoadingSpinner /></div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Ride History</h1>
      {rides.length === 0 ? (
        <div className="text-gray-600">No rides found.</div>
      ) : (
        <div className="space-y-3">
          {rides.map(ride => (
            <div key={ride.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-gray-900">{ride.status}</div>
                  <div className="text-sm text-gray-600">Distance: {ride.distance_km ?? 0} km • Duration: {ride.duration_minutes ?? 0} min</div>
                </div>
                {ride.total_fare !== null && (
                  <div className="text-sm font-semibold">Fare: Rs. {ride.total_fare?.toFixed?.(2) ?? ride.total_fare}</div>
                )}
              </div>
              <div className="text-xs text-gray-500 mt-1">{new Date(ride.created_at).toLocaleString()}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


