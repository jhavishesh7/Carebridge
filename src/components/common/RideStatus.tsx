import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

type Update = { id: string; status: string; notes: string | null; created_at: string };

export function RideStatus({ appointmentId }: { appointmentId: string }) {
  const [rideId, setRideId] = useState<string | null>(null);
  const [updates, setUpdates] = useState<Update[]>([]);

  useEffect(() => {
    async function load() {
      const { data: ride } = await supabase.from('rides').select('id').eq('appointment_id', appointmentId).maybeSingle();
      const rId = ride?.id || null;
      setRideId(rId);
      if (rId) {
        const { data } = await supabase
          .from('ride_status_updates')
          .select('id,status,notes,created_at')
          .eq('ride_id', rId)
          .order('created_at', { ascending: true });
        setUpdates(data || []);
      } else {
        setUpdates([]);
      }
    }
    load();
  }, [appointmentId]);

  useEffect(() => {
    if (!rideId) return;
    const channel = supabase
      .channel('realtime:ride-status-' + rideId)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ride_status_updates', filter: `ride_id=eq.${rideId}` }, (payload: { new: Update }) => {
        setUpdates(prev => [...prev, payload.new as Update]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [rideId]);

  if (!rideId) return null;

  const stages = ['accepted','pickup','en_route','at_hospital','in_appointment','returning','completed'];
  const currentIndex = updates.length ? Math.max(0, stages.indexOf(updates[updates.length - 1].status)) : 0;

  return (
    <div className="mt-3">
      <div className="flex items-center space-x-2 text-xs text-gray-600">
        {stages.map((st, i) => (
          <div key={st} className="flex items-center">
            <div className={`h-2 w-2 rounded-full ${i <= currentIndex ? 'bg-green-600' : 'bg-gray-300'}`} />
            <span className={`ml-1 ${i <= currentIndex ? 'text-green-700' : 'text-gray-500'}`}>{st.replace('_',' ')}</span>
            {i < stages.length - 1 && <span className="mx-2 h-px w-6 bg-gray-300" />}
          </div>
        ))}
      </div>
    </div>
  );
}


