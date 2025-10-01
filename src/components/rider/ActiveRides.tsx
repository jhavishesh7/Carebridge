import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Appointment } from '../../lib/database.types';
import { useAuth } from '../../contexts/AuthContext';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Clock, MapPin } from 'lucide-react';
import { estimateFromAddresses } from '../../lib/fare';

export function ActiveRides() {
  const { profile } = useAuth();
  const [rides, setRides] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [waiting, setWaiting] = useState<Record<string, number>>({});

  useEffect(() => {
    load();
  }, [profile?.id]);

  const load = async () => {
    if (!profile) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('rider_id', profile.id)
        .in('status', ['accepted', 'in_progress'])
        .order('appointment_date', { ascending: true });
      if (error) throw error;
      setRides(data || []);
    } finally {
      setLoading(false);
    }
  };

  const start = async (id: string) => {
    // Try to show ETA modal (simple alert for now)
    try {
      const appt = rides.find(x => x.id === id);
      if (appt) {
        // Attempt geolocation; fallback to route estimate only
        let msg = '';
        const est = await estimateFromAddresses(appt.pickup_location, appt.hospital_address);
        if (est) {
          msg = `Approx. ${Math.round(est.durationMinutes)} min to patient (one-way).`;
        }
        if (msg) alert(msg);
      }
    } catch {}
    const { error } = await supabase.from('appointments').update({ status: 'in_progress', updated_at: new Date().toISOString() }).eq('id', id);
    if (!error) await load();
  };

  const complete = async (id: string) => {
    const extraTime = waiting[id] || 0;
    // add Rs. 6 per minute waiting
    const { data: apptData } = await supabase.from('appointments').select('total_cost').eq('id', id).maybeSingle();
    const newTotal = (apptData?.total_cost ?? 0) + extraTime * 6;
    const { error } = await supabase.from('appointments').update({ status: 'completed', total_cost: newTotal, updated_at: new Date().toISOString() }).eq('id', id);
    if (!error) await load();
  };

  if (loading) return <div className="p-6"><LoadingSpinner /></div>;
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Active Rides</h1>
      {rides.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Clock className="h-10 w-10 mx-auto mb-3 text-gray-400" />
          No active rides
        </div>
      ) : (
        <div className="space-y-3">
          {rides.map(r => (
            <div key={r.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="font-semibold">{r.hospital_name}</div>
              <div className="text-sm text-gray-600 flex items-center space-x-2"><MapPin className="h-4 w-4" /><span>{r.pickup_location} → {r.hospital_address}</span></div>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
                {r.status === 'accepted' && (
                  <button onClick={() => start(r.id)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Start Ride</button>
                )}
                {r.status === 'in_progress' && (
                  <>
                    <div className="flex items-center space-x-2">
                      <label className="text-sm text-gray-700">Waiting (min)</label>
                      <input type="number" min={0} value={waiting[r.id] || 0} onChange={e => setWaiting({ ...waiting, [r.id]: parseInt(e.target.value || '0') })} className="w-24 border rounded px-2 py-1" />
                    </div>
                    <button onClick={() => complete(r.id)} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">Complete Trip</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


