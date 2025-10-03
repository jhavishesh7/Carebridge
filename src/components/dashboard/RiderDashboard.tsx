import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Car, DollarSign, Clock, Star, MapPin, User } from 'lucide-react';
import type { Appointment, Earning } from '../../lib/database.types';
import { format } from 'date-fns';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { computeFare, estimateFromAddresses } from '../../lib/fare';
// RideStatus is used only in PatientDashboard; avoid unused import here
import { RideFlowModal } from '../common/RideFlowModal';
import { ContactDrawer } from '../common/ContactDrawer';
import { Snackbar } from '../ui/Snackbar';

export function RiderDashboard() {
  const { profile } = useAuth();
  const sb: any = supabase;
  const [availableRides, setAvailableRides] = useState<Appointment[]>([]);
  const [activeRides, setActiveRides] = useState<Appointment[]>([]);
  const [_earnings, setEarnings] = useState<Earning[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalEarnings: 0,
    completedRides: 0,
    activeRides: 0,
    rating: 0,
  });
  const [_inProgressId, setInProgressId] = useState<string | null>(null);
  const [waitingMinutes, setWaitingMinutes] = useState<number>(0);
  const [etaModal, setEtaModal] = useState<{ open: boolean; text: string; apptId: string | null }>({ open: false, text: '', apptId: null });
  const [hospitalForm, setHospitalForm] = useState<{ open: boolean; apptId: string | null; notes: string }>({ open: false, apptId: null, notes: '' });
  const [actionError, setActionError] = useState<string | null>(null);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [fareEstimates, setFareEstimates] = useState<Record<string, number>>({});
  const [rideModal, setRideModal] = useState<{ open: boolean; apptId: string | null }>({ open: false, apptId: null });
  const [contact, setContact] = useState<{ open: boolean; name?: string; phone?: string; address?: string }>({ open: false });
  const [snackbar, setSnackbar] = useState<{ open: boolean; title?: string; message?: string; appointmentId?: string | null }>({ open: false });

  useEffect(() => {
    fetchData();
  }, [profile?.id]);

  // Subscribe to notifications for showing invoice toast
  useEffect(() => {
    if (!profile) return;
    const channel = supabase
      .channel('realtime:notifications-rider')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${profile.id}` }, (payload: { new: any }) => {
        const rec = payload.new as any;
        if (rec.type === 'invoice' && typeof rec.message === 'string') {
          const m = rec.message as string;
          const match = m.match(/appointment:([a-z0-9\-]+)/i);
          const apptId = match ? match[1] : null;
          setSnackbar({ open: true, title: rec.title, message: 'Invoice is available', appointmentId: apptId });
        }
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [profile?.id]);

  const fetchData = async () => {
    try {
      await Promise.all([
        fetchAvailableRides(),
        fetchActiveRides(),
        fetchEarnings(),
        fetchStats(),
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableRides = async () => {
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        profiles:patient_id (
          full_name,
          phone,
          medical_conditions
        )
      `)
      .eq('status', 'pending')
      .is('rider_id', null)
      .order('appointment_date', { ascending: true })
      .limit(5);

    if (error) throw error;
    const rows = data || [];
    setAvailableRides(rows);
    // compute estimated fares (round trip) for display
    try {
      const entries: Record<string, number> = {};
      await Promise.all(
        (rows as any[]).map(async (ride: any) => {
          try {
            const est = await estimateFromAddresses(ride.pickup_location, ride.hospital_address);
            if (est) {
              const km = Math.round(est.distanceKm * 2 * 100) / 100;
              const mins = Math.round(est.durationMinutes * 2);
              const f = computeFare(km, mins, { enhancedSupport: false });
              entries[ride.id] = f.total;
            }
          } catch {}
        })
      );
      setFareEstimates(entries);
    } catch {}
  };

  const fetchActiveRides = async () => {
    if (!profile?.id) return setActiveRides([]);
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        profiles:patient_id (
          full_name,
          phone,
          medical_conditions
        )
      `)
      .eq('rider_id', profile.id)
      .in('status', ['accepted', 'in_progress'])
      .order('appointment_date', { ascending: true });

    if (error) throw error;
    setActiveRides(data || []);
  };

  const fetchEarnings = async () => {
    if (!profile?.id) return setEarnings([]);
    const { data, error } = await supabase
      .from('earnings')
      .select('*')
      .eq('rider_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) throw error;
    setEarnings(data || []);
  };

  const fetchStats = async () => {
    if (!profile?.id) return;
    const { data: appointmentData } = await supabase
      .from('appointments')
      .select('status')
      .eq('rider_id', profile.id);

    const { data: earningData } = await supabase
      .from('earnings')
      .select('net_amount')
      .eq('rider_id', profile.id);

    if (appointmentData && earningData) {
      const completed = (appointmentData as any).filter((a: any) => a.status === 'completed').length;
      const active = (appointmentData as any).filter((a: any) => a.status === 'accepted' || a.status === 'in_progress').length;
      const total = (earningData as any).reduce((sum: number, earning: any) => sum + earning.net_amount, 0);

      setStats({
        totalEarnings: total,
        completedRides: completed,
        activeRides: active,
        rating: profile?.rating || 5.0,
      });
    }
  };

  const acceptRide = async (appointmentId: string) => {
    try {
      setActionError(null);
      setAcceptingId(appointmentId);
      const appt = [...availableRides, ...activeRides].find(a => a.id === appointmentId);
      if (!appt || !profile?.id) throw new Error('Missing appointment or profile');
          const est = await estimateFromAddresses(appt.pickup_location, appt.hospital_address);
      const roundKm = est ? Math.round(est.distanceKm * 2 * 100) / 100 : 0;
      const roundMin = est ? Math.round(est.durationMinutes * 2) : 0;
      let rpcError = null as any;
  const rpc = await sb.rpc('accept_ride_with_fare', {
        p_appointment_id: appointmentId,
        p_rider_id: profile.id,
        p_distance_km: roundKm,
        p_duration_min: roundMin,
        p_assistance_enhanced: false,
      });
      rpcError = rpc.error;
      if (rpcError && rpcError.code === '42702') {
        // Fallback: client-side write when RPC fails due to ambiguous column in deployed fn
        const fare = computeFare(roundKm, roundMin, { enhancedSupport: false });
    const { data: rideRow, error: rideError } = await sb
          .from('rides')
          .insert({
            appointment_id: appointmentId,
            patient_id: appt.patient_id,
            rider_id: profile.id,
            status: 'accepted',
            distance_km: roundKm,
            duration_minutes: roundMin,
      base_fare: fare.baseFare,
      distance_fare: fare.distanceFare,
      time_fare: fare.timeFare,
            total_fare: fare.total,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select('id')
          .maybeSingle();
        if (rideError) throw rideError;
        if (rideRow?.id) {
          await sb.from('ride_status_updates').insert({ ride_id: rideRow.id, status: 'accepted', created_at: new Date().toISOString() } as any);
        }
  await sb
          .from('appointments')
          .update({ rider_id: profile.id, status: 'accepted', total_cost: fare.total, updated_at: new Date().toISOString() })
          .eq('id', appointmentId);
      } else if (rpcError) {
        throw rpcError;
      }

      // Refresh data
      await fetchData();
    } catch (error) {
      console.error('Error accepting ride:', error);
      setActionError((error as any)?.message || 'Failed to accept ride');
    } finally {
      setAcceptingId(null);
    }
  };

  const startRide = async (appointmentId: string) => {
    // Open ETA modal for rider input
    setEtaModal({ open: true, text: '', apptId: appointmentId });
  };

  const confirmStartWithEta = async () => {
    if (!etaModal.apptId) return;
    try {
  const { error } = await sb
        .from('appointments')
        .update({ status: 'in_progress', updated_at: new Date().toISOString() })
        .eq('id', etaModal.apptId);
      if (error) throw error;

      // Notify patient with ETA via RPC create_notification
      const appt = [...availableRides, ...activeRides].find(a => a.id === etaModal.apptId);
      if (appt) {
        await sb.rpc('create_notification', {
          p_user_id: appt.patient_id,
          p_title: 'Ride Starting',
          p_message: `Rider will arrive in about ${etaModal.text} minutes`,
          p_type: 'ride'
        });
      }

      setInProgressId(etaModal.apptId);
      setEtaModal({ open: false, text: '', apptId: null });
      await fetchData();
    } catch (e) {
      console.error('Error starting ride:', e);
    }
  };

  const completeRide = async (appointmentId: string) => {
    try {
      // Add waiting time fare into total_cost if exists
      const appt = activeRides.find(a => a.id === appointmentId);
      let newTotal: number | null = appt?.total_cost ?? null;
      if (appt) {
        // If waiting minutes were tracked during hospital phase, add time fare for them
        const timeFareAddon = waitingMinutes * 6; // Rs/min
        newTotal = (newTotal ?? 0) + timeFareAddon;
      }
      // Mark rider completion through RPC
      const { data: ride } = await sb.from('rides').select('id').eq('appointment_id', appointmentId).maybeSingle();
      if (ride?.id) {
        await sb.from('appointments').update({ total_cost: newTotal, updated_at: new Date().toISOString() }).eq('id', appointmentId);
        await sb.rpc('mark_rider_complete', { p_ride_id: ride.id });
      }
      setInProgressId(null);
      setWaitingMinutes(0);
      await fetchData();
    } catch (e) {
      console.error('Error completing ride:', e);
    }
  };

  const markReachedPickup = async (appointmentId: string) => {
    const { data: ride } = await sb.from('rides').select('id').eq('appointment_id', appointmentId).maybeSingle();
    if (ride?.id) {
      await sb.rpc('mark_ride_step', { p_ride_id: ride.id, p_status: 'pickup' });
    }
  };

  const markAtHospital = async (appointmentId: string) => {
    const { data: ride } = await sb.from('rides').select('id').eq('appointment_id', appointmentId).maybeSingle();
    if (ride?.id) {
      await sb.rpc('mark_ride_step', { p_ride_id: ride.id, p_status: 'at_hospital' });
      setHospitalForm({ open: true, apptId: appointmentId, notes: '' });
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Welcome back, {profile?.full_name}</h1>
        <p className="text-gray-600 mt-2">Help patients get to their healthcare appointments safely</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Earnings</p>
              <p className="text-2xl font-bold text-gray-900">${stats.totalEarnings.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Car className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Completed Rides</p>
              <p className="text-2xl font-bold text-gray-900">{stats.completedRides}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Clock className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Rides</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activeRides}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Star className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Rating</p>
              <p className="text-2xl font-bold text-gray-900">{stats.rating.toFixed(1)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Available Rides */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Available Rides</h2>
          </div>
          
          <div className="p-6">
            {availableRides.length === 0 ? (
              <div className="text-center py-8">
                <Car className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No available rides at the moment</p>
              </div>
            ) : (
              <div className="space-y-4">
                {availableRides.map((ride) => (
                  <div
                    key={ride.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <User className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              {(ride as any).profiles?.full_name || 'Patient'}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {format(new Date(ride.appointment_date), 'PPP p')}
                            </p>
                          </div>
                        </div>
                        
                        <div className="space-y-2 text-sm text-gray-600">
                          <div className="flex items-center space-x-2">
                            <MapPin className="h-4 w-4" />
                            <span>{ride.pickup_location}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <MapPin className="h-4 w-4" />
                            <span>{ride.hospital_name}</span>
                          </div>
                        </div>
                        
                        {ride.special_instructions && (
                          <div className="mt-3 p-3 bg-yellow-50 rounded-lg">
                            <p className="text-sm text-yellow-800">
                              <strong>Special Instructions:</strong> {ride.special_instructions}
                            </p>
                          </div>
                        )}
                      </div>
                      
                      <button
                        onClick={() => acceptRide(ride.id)}
                        disabled={acceptingId === ride.id}
                        className="ml-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                      >
                        {acceptingId === ride.id ? 'Accepting...' : 'Accept'}
                      </button>
                    </div>
                    {fareEstimates[ride.id] !== undefined && (
                      <div className="mt-2 text-sm font-semibold text-gray-900">Est. Fare: Rs. {fareEstimates[ride.id].toFixed(2)}</div>
                    )}
                    {actionError && (
                      <div className="mt-2 text-sm text-red-600">{actionError}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
      <Snackbar
        open={snackbar.open}
        title="Success"
        message={snackbar.message}
        onClose={() => setSnackbar({ open: false, message: '' })}
      />
    </div>
  );
}