import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Calendar, Clock, MapPin, Plus, Activity } from 'lucide-react';
import { useRideStatusUpdates } from '../../hooks/useRideStatusUpdates';
import type { Appointment } from '../../lib/database.types';
import { format } from 'date-fns';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { RideStatus } from '../common/RideStatus';
import { RideFlowModal } from '../common/RideFlowModal';
import { ContactDrawer } from '../common/ContactDrawer';
import { Snackbar } from '../ui/Snackbar';

export function PatientDashboard() {
  const { profile } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [popup, setPopup] = useState<string | null>(null);
  const [rideModal, setRideModal] = useState<{ open: boolean; apptId: string | null }>({ open: false, apptId: null });
  const [snackbar, setSnackbar] = useState<{ open: boolean; title?: string; message?: string; appointmentId?: string | null }>({ open: false });
  const [contact, setContact] = useState<{ open: boolean; name?: string; phone?: string; address?: string }>({ open: false });
  const [stats, setStats] = useState({
    upcoming: 0,
    completed: 0,
    totalRides: 0,
  });

  useEffect(() => {
    fetchAppointments();
    fetchStats();
    // Subscribe to notifications for patient popups
    if (!profile) return;
    const channel = supabase
      .channel('realtime:notifications-dashboard')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${profile.id}` }, (payload: { new: any }) => {
        const rec = payload.new as any;
        // Invoice notifications include appointment id like 'Invoice generated for appointment:ID'
        if (rec.type === 'invoice' && typeof rec.message === 'string') {
          const m = rec.message as string;
          const match = m.match(/appointment:([a-z0-9\-]+)/i);
          const apptId = match ? match[1] : null;
          setPopup(`${rec.title}: ${apptId ? 'Invoice ready' : rec.message}`);
          setSnackbar({ open: true, title: rec.title, message: 'Invoice is available', appointmentId: apptId });
        } else {
          setPopup(`${rec.title}: ${rec.message}`);
        }
        setTimeout(() => setPopup(null), 8000);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile?.id, rideModal.open]);

  useRideStatusUpdates({
    userId: profile?.id || null,
    isPatient: true,
    rideModal,
    setRideModal,
  });

  const fetchAppointments = async () => {
    try {
      let data = null;
      let error = null;
      if (profile?.id) {
        const res = await supabase
          .from('appointments')
          .select('*')
          .eq('patient_id', profile.id)
          .order('appointment_date', { ascending: true })
          .limit(5);
        data = res.data;
        error = res.error;
      }

      if (error) throw error;
      setAppointments(data || []);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      let appointmentData: Array<{ status: string }> | null = null;
      if (profile?.id) {
        const res = await supabase
          .from('appointments')
          .select('status')
          .eq('patient_id', profile.id);
        appointmentData = (res.data as any) || null;
      }

      if (appointmentData) {
  const upcoming = (appointmentData || []).filter(a => a.status === 'pending' || a.status === 'accepted').length;
  const completed = (appointmentData || []).filter(a => a.status === 'completed').length;
        setStats({
          upcoming,
          completed,
          totalRides: appointmentData.length,
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'accepted':
        return 'bg-blue-100 text-blue-800';
      case 'in_progress':
        return 'bg-purple-100 text-purple-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
      {popup && (
        <div className="fixed top-20 right-6 z-50 bg-white border border-blue-200 shadow-lg rounded-lg p-4 max-w-sm">
          <div className="text-sm text-gray-800">{popup}</div>
        </div>
      )}
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Welcome back, {profile?.full_name}</h1>
        <p className="text-gray-600 mt-2">Manage your healthcare appointments and transportation</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Upcoming</p>
              <p className="text-2xl font-bold text-gray-900">{stats.upcoming}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <Activity className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Clock className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Rides</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalRides}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a href="/book" className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Plus className="h-5 w-5 text-white" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-blue-900">Book New Appointment</p>
              <p className="text-sm text-blue-700">Schedule your next medical visit</p>
            </div>
          </a>

          <a href="/appointments" className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg border border-green-200 hover:bg-green-100 transition-colors">
            <div className="p-2 bg-green-600 rounded-lg">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-green-900">View All Appointments</p>
              <p className="text-sm text-green-700">See your complete schedule</p>
            </div>
          </a>
        </div>
      </div>

      {/* Recent Appointments */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Recent Appointments</h2>
        </div>
        
        <div className="p-6">
          {appointments.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No appointments yet</p>
              <a href="/book" className="mt-4 inline-block bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                Book Your First Appointment
              </a>
            </div>
          ) : (
            <div className="space-y-4">
              {appointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                    <div className="flex items-center space-x-4">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <MapPin className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{appointment.hospital_name}</h3>
                      <p className="text-sm text-gray-600">
                        {format(new Date(appointment.appointment_date), 'PPP p')}
                      </p>
                      <p className="text-sm text-gray-500">{appointment.pickup_location}</p>
                        {appointment.total_cost !== null && (
                          <p className="text-sm text-gray-900 font-semibold">Fare: Rs. {appointment.total_cost?.toFixed?.(2) ?? appointment.total_cost}</p>
                        )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                      {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                    </span>
                    {appointment.status === 'completed' && (
                      <a
                        className="text-blue-600 hover:text-blue-700 text-sm font-semibold"
                        href={`/invoice/${appointment.id}`}
                      >
                        View Invoice
                      </a>
                    )}
                    {(appointment.status === 'accepted' || appointment.status === 'in_progress') && (
                      <div className="flex items-center space-x-3">
                        <button onClick={() => setRideModal({ open: true, apptId: appointment.id })} className="text-blue-600 hover:text-blue-700 text-sm font-semibold">
                          View Ride Status
                        </button>
                        <button onClick={async () => {
                          const { data } = await supabase
                            .from('appointments')
                            .select('profiles:rider_id(full_name, phone, address)')
                            .eq('id', appointment.id)
                            .maybeSingle();
                          const r = (data as any)?.profiles;
                          setContact({ open: true, name: r?.full_name, phone: r?.phone, address: r?.address });
                        }} className="text-gray-600 hover:text-gray-700 text-sm font-semibold">Contact Rider</button>
                      </div>
                    )}
                  </div>
                  <div className="w-full mt-3">
                    {(appointment.status === 'accepted' || appointment.status === 'in_progress') && (
                      <div className="space-y-2">
                        <RideStatus appointmentId={appointment.id} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <RideFlowModal open={rideModal.open} onClose={() => setRideModal({ open: false, apptId: null })} appointmentId={rideModal.apptId || ''} role="patient" />
      <ContactDrawer open={contact.open} onClose={() => setContact({ open: false })} name={contact.name} phone={contact.phone} address={contact.address} roleLabel="Rider" />
      <Snackbar
        open={snackbar.open}
        title={snackbar.title}
        message={snackbar.message}
        onClose={() => setSnackbar({ open: false })}
        action={snackbar.appointmentId ? (
          <a href={`/invoice/${snackbar.appointmentId}`} className="bg-blue-600 text-white px-3 py-1 rounded text-sm">View Invoice</a>
        ) : null}
      />
    </div>
  );
}