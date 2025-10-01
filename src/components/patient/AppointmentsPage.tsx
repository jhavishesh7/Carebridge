import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import type { Appointment } from '../../lib/database.types';
import { format } from 'date-fns';
import { LoadingSpinner } from '../ui/LoadingSpinner';

export function AppointmentsPage() {
  const { profile } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAppointments();
  }, [profile?.id]);

  const fetchAppointments = async () => {
    if (!profile) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('patient_id', profile.id)
        .order('appointment_date', { ascending: false });

      if (error) throw error;
      setAppointments(data || []);
    } catch (e) {
      console.error('Error loading appointments', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Appointments</h1>
        <a href="/book" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">New Appointment</a>
      </div>
      {loading ? (
        <LoadingSpinner />
      ) : appointments.length === 0 ? (
        <div className="text-gray-600">You have no appointments.</div>
      ) : (
        <div className="space-y-3">
          {appointments.map(appt => (
            <div key={appt.id} className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between">
              <div>
                <div className="font-semibold text-gray-900">{appt.hospital_name}</div>
                <div className="text-sm text-gray-600">{appt.hospital_address}</div>
                <div className="text-sm text-gray-600">{format(new Date(appt.appointment_date), 'PPP p')}</div>
              </div>
              <span className="text-xs px-3 py-1 rounded-full bg-gray-100 text-gray-800 capitalize">{appt.status.replace('_', ' ')}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


