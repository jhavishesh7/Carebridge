import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Appointment } from '../../lib/database.types';
import { useAuth } from '../../contexts/AuthContext';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { MapPin, Car } from 'lucide-react';
import { format } from 'date-fns';
import { estimateFromAddresses } from '../../lib/fare';

export function AvailableRides() {
  const { profile } = useAuth();
  const [rides, setRides] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('status', 'pending')
        .is('rider_id', null)
        .order('appointment_date', { ascending: true });
      if (error) throw error;
      setRides(data || []);
    } finally {
      setLoading(false);
    }
  };

  const accept = async (appt: Appointment) => {
    try {
      const est = await estimateFromAddresses(appt.pickup_location, appt.hospital_address);
      if (!est || !profile?.id) throw new Error('Missing estimate or profile');
      const roundKm = Math.round(est.distanceKm * 2 * 100) / 100;
      const roundMin = Math.round(est.durationMinutes * 2);
      // Call backend RPC to create ride and persist fare
      const { error: rpcError } = await supabase.rpc('accept_ride_with_fare', {
        p_appointment_id: appt.id,
        p_rider_id: profile.id,
        p_distance_km: roundKm,
        p_duration_min: roundMin,
        p_assistance_enhanced: false,
      });
      if (rpcError) throw rpcError;
      await load();
    } catch (e) {
      console.error('Accept failed', e);
    }
  };

  if (loading) return <div className="p-6"><LoadingSpinner /></div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Available Rides</h1>
      {rides.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Car className="h-10 w-10 mx-auto mb-3 text-gray-400" />
          No available rides at the moment
        </div>
      ) : (
        <div className="space-y-3">
          {rides.map(r => (
            <div key={r.id} className="bg-white border border-gray-200 rounded-lg p-4 flex items-start justify-between">
              <div>
                <div className="font-semibold">{r.hospital_name}</div>
                <div className="text-sm text-gray-600">{format(new Date(r.appointment_date), 'PPP p')}</div>
                <div className="mt-2 text-sm text-gray-600">
                  <div className="flex items-center space-x-2"><MapPin className="h-4 w-4" /><span>{r.pickup_location}</span></div>
                  <div className="flex items-center space-x-2"><MapPin className="h-4 w-4" /><span>{r.hospital_address}</span></div>
                </div>
                {r.total_cost !== null && (
                  <div className="mt-2 text-sm font-semibold">Estimated Fare: Rs. {r.total_cost?.toFixed?.(2) ?? r.total_cost}</div>
                )}
              </div>
              <button onClick={() => accept(r)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Accept</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


