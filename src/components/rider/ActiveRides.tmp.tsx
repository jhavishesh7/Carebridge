import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Appointment } from '../../lib/database.types';
import { useAuth } from '../../contexts/AuthContext';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Clock, MapPin } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { RideFlowModal } from '../common/RideFlowModal';
import { useRideStatusUpdates } from '../../hooks/useRideStatusUpdates';

export function ActiveRides(): JSX.Element {
  const { profile } = useAuth();
  const [rides, setRides] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [waiting, setWaiting] = useState<Record<string, number>>({});
  const [etaModal, setEtaModal] = useState<{ open: boolean; text: string; apptId: string | null }>({ open: false, text: '', apptId: null });
  const [rideModal, setRideModal] = useState<{ open: boolean; apptId: string | null }>({ open: false, apptId: null });

  useEffect(() => {
    load();
    return () => {
      setRideModal({ open: false, apptId: null });
    };
  }, [profile?.id]);

  useRideStatusUpdates({
    userId: profile?.id || null,
    isPatient: false,
    rideModal,
    setRideModal,
  });

  useEffect(() => {
    if (rideModal.open && rideModal.apptId) {
      const loadRideData = async () => {
        const { data: ride } = await supabase
          .from('rides')
          .select('id,status')
          .eq('appointment_id', rideModal.apptId)
          .maybeSingle();
          
        if (!ride) {
          setRideModal({ open: false, apptId: null });
        }
      };
      loadRideData();
    }
  }, [rideModal.open, rideModal.apptId]);

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

  const startRide = async (id: string) => {
    setEtaModal({ open: true, text: '', apptId: id });
    setRideModal({ open: true, apptId: id });
  };

  const confirmStartWithEta = async () => {
    if (!etaModal.apptId) return;
    try {
      const { error } = await supabase.from('appointments').update({ status: 'in_progress', updated_at: new Date().toISOString() }).eq('id', etaModal.apptId);
      if (error) throw error;

      const appt = rides.find(a => a.id === etaModal.apptId);
      if (appt) {
        await supabase.rpc('create_notification', {
          p_user_id: appt.patient_id,
          p_title: 'Ride Starting',
          p_message: `Rider will arrive in about ${etaModal.text} minutes`,
          p_type: 'ride'
        });
      }

      setEtaModal({ open: false, text: '', apptId: null });
      await load();
    } catch (e) {
      console.error('Error starting ride:', e);
    }
  };

  const complete = async (id: string) => {
    const extraTime = waiting[id] || 0;
    const { data: apptData } = await supabase.from('appointments').select('total_cost').eq('id', id).maybeSingle();
    const newTotal = (apptData?.total_cost ?? 0) + extraTime * 6;
    const { error } = await supabase.from('appointments').update({ status: 'in_progress', total_cost: newTotal, updated_at: new Date().toISOString() }).eq('id', id);
    if (!error) await load();
  };

  const markReached = async (id: string) => {
    const { data: ride } = await supabase.from('rides').select('id').eq('appointment_id', id).maybeSingle();
    if (ride?.id) {
      await supabase.from('ride_status_updates').insert({ ride_id: ride.id, status: 'pickup', created_at: new Date().toISOString() });
      await supabase.from('rides').update({ status: 'pickup', updated_at: new Date().toISOString() }).eq('id', ride.id);
      await load();
    }
  };

  const markAtHospital = async (id: string) => {
    const { data: ride } = await supabase.from('rides').select('id').eq('appointment_id', id).maybeSingle();
    if (ride?.id) {
      await supabase.from('ride_status_updates').insert({ ride_id: ride.id, status: 'at_hospital', created_at: new Date().toISOString() });
      await supabase.from('rides').update({ status: 'at_hospital', updated_at: new Date().toISOString() }).eq('id', ride.id);
      await load();
    }
  };

  const markRiderCompleted = async (id: string) => {
    const { data: ride } = await supabase.from('rides').select('id, appointment_id, patient_completed').eq('appointment_id', id).maybeSingle();
    if (ride?.id) {
      await supabase.from('rides').update({ rider_completed: true, status: 'completed', updated_at: new Date().toISOString() }).eq('id', ride.id);
      if (ride.patient_completed) {
        await supabase.from('appointments').update({ status: 'completed', updated_at: new Date().toISOString() }).eq('id', ride.appointment_id);
      }
      await load();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen gradient-background p-6">
        <div className="flex flex-col items-center justify-center space-y-4">
          <LoadingSpinner />
          <p className="text-white text-lg font-medium loading-dots">Loading your rides</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6 animate-slide-in flex items-center">
          <Clock className="h-8 w-8 mr-3 text-blue-600 animate-float" />
          Active Rides
        </h1>
        
        {rides.length === 0 ? (
          <div className="text-center py-16 glass-effect rounded-2xl shadow-lg animate-slide-in">
            <div className="animate-float">
              <Clock className="h-16 w-16 mx-auto mb-4 text-blue-400" />
            </div>
            <p className="text-xl text-gray-600 font-medium">No active rides</p>
            <p className="text-gray-500 mt-2">Your upcoming rides will appear here</p>
          </div>
        ) : (
          <div className="space-y-6">
            {rides.map((r: Appointment, index: number) => (
              <div 
                key={r.id} 
                className="glass-effect rounded-xl p-6 card-hover animate-slide-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-3 bg-blue-100 rounded-lg animate-pulse-shadow">
                        <MapPin className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900">{r.hospital_name}</h3>
                        <div className="flex items-center text-sm text-gray-600 mt-1">
                          <span>{r.pickup_location}</span>
                          <svg className="h-4 w-4 mx-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                          </svg>
                          <span>{r.hospital_address}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      {r.status === 'accepted' && (
                        <div className="flex gap-3">
                          <button 
                            onClick={() => startRide(r.id)} 
                            className="button-animate bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-2 rounded-lg font-medium shadow-lg shadow-blue-500/30"
                          >
                            Start Ride
                          </button>
                          <button 
                            onClick={() => setRideModal({ open: true, apptId: r.id })} 
                            className="button-animate bg-gradient-to-r from-gray-600 to-gray-700 text-white px-6 py-2 rounded-lg font-medium"
                          >
                            View Status
                          </button>
                        </div>
                      )}
                      {r.status === 'in_progress' && (
                        <div className="w-full space-y-4">
                          <div className="flex flex-wrap items-center gap-3">
                            <button 
                              onClick={() => markReached(r.id)} 
                              className="button-animate bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-4 py-2 rounded-lg font-medium"
                            >
                              Reached Pickup
                            </button>
                            <button 
                              onClick={() => markAtHospital(r.id)} 
                              className="button-animate bg-gradient-to-r from-yellow-600 to-yellow-700 text-white px-4 py-2 rounded-lg font-medium"
                            >
                              At Hospital
                            </button>
                            <button 
                              onClick={() => markRiderCompleted(r.id)} 
                              className="button-animate bg-gradient-to-r from-green-600 to-green-700 text-white px-4 py-2 rounded-lg font-medium"
                            >
                              Complete Trip
                            </button>
                            <button 
                              onClick={() => setRideModal({ open: true, apptId: r.id })} 
                              className="button-animate bg-gradient-to-r from-gray-600 to-gray-700 text-white px-4 py-2 rounded-lg font-medium"
                            >
                              View Status
                            </button>
                          </div>

                          <div className="flex items-center gap-4 bg-white/50 p-4 rounded-lg">
                            <div className="flex items-center space-x-2">
                              <label className="text-sm font-medium text-gray-700">
                                Waiting Time
                              </label>
                              <input 
                                type="number" 
                                min={0} 
                                value={waiting[r.id] || 0} 
                                onChange={e => setWaiting({ ...waiting, [r.id]: parseInt(e.target.value || '0') })} 
                                className="w-24 border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" 
                              />
                              <span className="text-sm text-gray-600">minutes</span>
                            </div>
                            <button 
                              onClick={() => complete(r.id)} 
                              className="button-animate bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-lg font-medium"
                            >
                              Update Fare
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <Modal 
          open={etaModal.open} 
          title="Estimated Time" 
          onClose={() => setEtaModal({ open: false, text: '', apptId: null })}
        >
          <div className="p-6 glass-effect rounded-xl">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Enter Estimated Arrival Time
            </h3>
            <input 
              type="text" 
              className="w-full border rounded-lg px-4 py-3 mb-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" 
              placeholder="Enter ETA in minutes..." 
              value={etaModal.text}
              onChange={e => setEtaModal({ ...etaModal, text: e.target.value })}
            />
            <div className="flex justify-end space-x-3">
              <button 
                onClick={() => setEtaModal({ open: false, text: '', apptId: null })} 
                className="px-4 py-2 rounded-lg border hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmStartWithEta} 
                className="button-animate bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-2 rounded-lg font-medium"
              >
                Start Ride
              </button>
            </div>
          </div>
        </Modal>

        <RideFlowModal 
          open={rideModal.open} 
          onClose={() => setRideModal({ open: false, apptId: null })} 
          appointmentId={rideModal.apptId || ''} 
          role="rider" 
        />
      </div>
    </div>
  );
}
