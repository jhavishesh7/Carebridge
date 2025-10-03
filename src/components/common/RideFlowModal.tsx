import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

type Role = 'rider' | 'patient';

interface Props {
  open: boolean;
  onClose: () => void;
  appointmentId: string;
  role: Role;
}

interface UpdateRow { id: string; status: string; notes: string | null; created_at: string }

export function RideFlowModal({ open, onClose, appointmentId, role }: Props) {
  const [rideId, setRideId] = useState<string | null>(null);
  const [updates, setUpdates] = useState<UpdateRow[]>([]);
  const [waiting, setWaiting] = useState(0);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
  const { data: ride } = await (supabase as any).from('rides').select('id,patient_id,rider_id').eq('appointment_id', appointmentId).maybeSingle();
      const rId = ride?.id ?? null;
      setRideId(rId);
      if (rId) {
        const { data } = await (supabase as any)
          .from('ride_status_updates')
          .select('id,status,notes,created_at')
          .eq('ride_id', rId)
          .order('created_at', { ascending: true });
        setUpdates(data || []);
      }
    })();
  }, [open, appointmentId]);

  useEffect(() => {
    if (!rideId || !open) return;
  const channel = supabase
      .channel('rt:rideflow:' + rideId)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ride_status_updates', filter: `ride_id=eq.${rideId}` }, (payload: { new: UpdateRow }) => {
        setUpdates(prev => [...prev, payload.new as UpdateRow]);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rides', filter: `id=eq.${rideId}` }, () => {})
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [rideId, open]);

  if (!open) return null;

  const addStep = async (status: string) => {
    if (!rideId) return;
    setSaving(true);
    try {
  await (supabase as any).from('ride_status_updates').insert({ ride_id: rideId, status, notes: notes || null, created_at: new Date().toISOString() } as any);
  await (supabase as any).from('rides').update({ status, updated_at: new Date().toISOString() }).eq('id', rideId);
    } finally {
      setSaving(false);
    }
  };

  const markCompleted = async () => {
    if (!rideId) return;
    setSaving(true);
    try {
      if (role === 'rider') {
  await (supabase as any).from('rides').update({ rider_completed: true, updated_at: new Date().toISOString(), status: 'completed' }).eq('id', rideId);
      } else {
  await (supabase as any).from('rides').update({ patient_completed: true, updated_at: new Date().toISOString() }).eq('id', rideId);
      }
      // finalize appointment if both completed
  const { data: r } = await (supabase as any).from('rides').select('appointment_id, rider_completed, patient_completed, rider_id, patient_id').eq('id', rideId).maybeSingle();
      if (r && r.rider_completed && r.patient_completed) {
  await (supabase as any).from('appointments').update({ status: 'completed', updated_at: new Date().toISOString() }).eq('id', r.appointment_id);
        // create invoice notification for both sides
        await (supabase as any).from('notifications').insert([
          { user_id: r.rider_id, title: 'Ride Completed', message: `Invoice generated for appointment:${r.appointment_id}`, type: 'invoice' },
          { user_id: r.patient_id, title: 'Ride Completed', message: `Invoice generated for appointment:${r.appointment_id}`, type: 'invoice' },
        ] as any);
      }
    } finally {
      setSaving(false);
    }
  };

  const stages = ['accepted','pickup','en_route','at_hospital','in_appointment','returning','completed'];
  const current = updates.length ? updates[updates.length - 1].status : 'accepted';

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex">
      <div className="m-auto w-full h-full md:h-[90%] md:w-[90%] bg-white rounded-none md:rounded-xl overflow-hidden shadow-2xl grid grid-cols-1 lg:grid-cols-3">
        <div className="p-6 border-r border-gray-200 bg-gray-50">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Ride Flow</h3>
          <ol className="space-y-3">
            {stages.map((s, idx) => (
              <li key={s} className={`p-3 rounded-lg flex items-center space-x-2 ${idx <= stages.indexOf(current) ? 'bg-green-50 border border-green-200' : 'bg-white border'}`}>
                <div className={`h-5 w-5 rounded-full flex items-center justify-center ${idx <= stages.indexOf(current) ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                  {idx <= stages.indexOf(current) ? '✓' : idx + 1}
                </div>
                <div className={`text-sm font-semibold ${idx <= stages.indexOf(current) ? 'text-green-800' : 'text-gray-700'}`}>{s.replace('_',' ')}</div>
              </li>
            ))}
          </ol>
          <div className="mt-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-2">Timeline</h4>
            <div className="space-y-2 max-h-64 overflow-auto pr-2">
              {updates.map(u => (
                <div key={u.id} className="text-xs text-gray-700">
                  <span className="font-semibold mr-2">{new Date(u.created_at).toLocaleString()}:</span>
                  <span className="capitalize">{u.status.replace('_',' ')}</span>
                  {u.notes && <span className="ml-2 text-gray-500">- {u.notes}</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="lg:col-span-2 p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-gray-900">Actions</h3>
            <button onClick={onClose} className="px-3 py-2 rounded border">Close</button>
          </div>
          {role === 'rider' ? (
            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <button disabled={saving} onClick={() => addStep('pickup')} className="bg-indigo-600 text-white px-4 py-2 rounded-lg disabled:opacity-50">Reached Pickup</button>
                <button disabled={saving} onClick={() => addStep('at_hospital')} className="bg-yellow-600 text-white px-4 py-2 rounded-lg disabled:opacity-50">Reached Hospital</button>
                <button disabled={saving} onClick={() => addStep('returning')} className="bg-blue-600 text-white px-4 py-2 rounded-lg disabled:opacity-50">Returning</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                <div className="flex items-center space-x-2">
                  <label className="text-sm text-gray-700">Waiting (min)</label>
                  <input type="number" min={0} value={waiting} onChange={e => setWaiting(parseInt(e.target.value || '0'))} className="w-24 border rounded px-2 py-1" />
                </div>
                <div className="md:col-span-2">
                  <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (optional)" className="w-full border rounded px-3 py-2" />
                </div>
              </div>
              <div className="pt-2">
                <button disabled={saving} onClick={markCompleted} className="bg-green-600 text-white px-4 py-2 rounded-lg disabled:opacity-50">Rider Completed</button>
              </div>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              <div className="text-gray-700">Your rider will update progress here. You can confirm completion when you reach home safely.</div>
              <div>
                <button disabled={saving} onClick={markCompleted} className="bg-green-600 text-white px-4 py-2 rounded-lg disabled:opacity-50">Patient Completed</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


