import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Car, DollarSign, Clock, Star, MapPin, User } from 'lucide-react';
import type { Appointment, Earning } from '../../lib/database.types';
import { format } from 'date-fns';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { computeFare, estimateFromAddresses } from '../../lib/fare';

export function RiderDashboard() {
  const { profile } = useAuth();
  const [availableRides, setAvailableRides] = useState<Appointment[]>([]);
  const [activeRides, setActiveRides] = useState<Appointment[]>([]);
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalEarnings: 0,
    completedRides: 0,
    activeRides: 0,
    rating: 0,
  });
  const [inProgressId, setInProgressId] = useState<string | null>(null);
  const [waitingMinutes, setWaitingMinutes] = useState<number>(0);

  useEffect(() => {
    fetchData();
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
    setAvailableRides(data || []);
  };

  const fetchActiveRides = async () => {
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
      .eq('rider_id', profile?.id)
      .in('status', ['accepted', 'in_progress'])
      .order('appointment_date', { ascending: true });

    if (error) throw error;
    setActiveRides(data || []);
  };

  const fetchEarnings = async () => {
    const { data, error } = await supabase
      .from('earnings')
      .select('*')
      .eq('rider_id', profile?.id)
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) throw error;
    setEarnings(data || []);
  };

  const fetchStats = async () => {
    const { data: appointmentData } = await supabase
      .from('appointments')
      .select('status')
      .eq('rider_id', profile?.id);

    const { data: earningData } = await supabase
      .from('earnings')
      .select('net_amount')
      .eq('rider_id', profile?.id);

    if (appointmentData && earningData) {
      const completed = appointmentData.filter(a => a.status === 'completed').length;
      const active = appointmentData.filter(a => a.status === 'accepted' || a.status === 'in_progress').length;
      const total = earningData.reduce((sum, earning) => sum + earning.net_amount, 0);

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
      // Try to compute and persist a fare estimate at accept-time
      const appt = [...availableRides, ...activeRides].find(a => a.id === appointmentId);
      let totalCost: number | null = null;
      if (appt) {
        try {
          const est = await estimateFromAddresses(appt.pickup_location, appt.hospital_address);
          if (est) {
            const roundTripKm = est.distanceKm * 2;
            const roundTripMinutes = est.durationMinutes * 2;
            const fare = computeFare(roundTripKm, roundTripMinutes, { enhancedSupport: false });
            totalCost = fare.total;
          }
        } catch (e) {
          console.warn('Fare estimate failed; proceeding without total_cost');
        }
      }
      const { error } = await supabase
        .from('appointments')
        .update({
          rider_id: profile?.id,
          status: 'accepted',
          updated_at: new Date().toISOString(),
          total_cost: totalCost,
        })
        .eq('id', appointmentId);

      if (error) throw error;

      // Refresh data
      await fetchData();
    } catch (error) {
      console.error('Error accepting ride:', error);
    }
  };

  const startRide = async (appointmentId: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'in_progress', updated_at: new Date().toISOString() })
        .eq('id', appointmentId);
      if (error) throw error;
      setInProgressId(appointmentId);
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
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'completed', total_cost: newTotal, updated_at: new Date().toISOString() })
        .eq('id', appointmentId);
      if (error) throw error;
      setInProgressId(null);
      setWaitingMinutes(0);
      await fetchData();
    } catch (e) {
      console.error('Error completing ride:', e);
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
                        className="ml-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Accept
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Active Rides */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Active Rides</h2>
          </div>
          
          <div className="p-6">
            {activeRides.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No active rides</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activeRides.map((ride) => (
                  <div
                    key={ride.id}
                    className="border border-green-200 bg-green-50 rounded-lg p-4"
                  >
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="p-2 bg-green-600 rounded-lg">
                        <User className="h-5 w-5 text-white" />
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
                    
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-2">
                      {ride.status === 'accepted' && (
                        <button onClick={() => startRide(ride.id)} className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">
                          Start Ride
                        </button>
                      )}
                      {ride.status === 'in_progress' && (
                        <>
                          <div className="flex items-center space-x-2">
                            <label className="text-sm text-gray-600">Waiting (min)</label>
                            <input type="number" min={0} value={waitingMinutes}
                                   onChange={e => setWaitingMinutes(parseInt(e.target.value || '0'))}
                                   className="w-24 border rounded px-2 py-1" />
                          </div>
                          <button onClick={() => completeRide(ride.id)} className="bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors">
                            Complete Trip
                          </button>
                        </>
                      )}
                      <button className="bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors">
                        Contact Patient
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}