// project/src/components/common/InvoiceDisplay.tsx
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import type { Appointment, Ride, Profile } from '../../lib/database.types';
import { format } from 'date-fns';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface InvoiceDetails {
  appointment: Appointment;
  ride: Ride | null;
  patient: Profile | null;
  rider: Profile | null;
}

export function InvoiceDisplay() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const [invoice, setInvoice] = useState<InvoiceDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchInvoice() {
      if (!appointmentId) {
        setError('Appointment ID is missing.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch appointment details
        const { data: appointmentData, error: appointmentError } = await supabase
          .from('appointments')
          .select('*')
          .eq('id', appointmentId)
          .maybeSingle();

        if (appointmentError) throw appointmentError;
        if (!appointmentData) {
          setError('Appointment not found.');
          setLoading(false);
          return;
        }

        // Fetch ride details (if available)
        const { data: rideData, error: rideError } = await supabase
          .from('rides')
          .select('*')
          .eq('appointment_id', appointmentId)
          .maybeSingle();

        if (rideError) throw rideError;

        // Fetch patient profile
        const { data: patientProfile, error: patientError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', appointmentData.patient_id)
          .maybeSingle();

        if (patientError) throw patientError;

        // Fetch rider profile (if rider_id exists)
        let riderProfile: Profile | null = null;
        if (appointmentData.rider_id) {
          const { data: riderData, error: riderError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', appointmentData.rider_id)
            .maybeSingle();
          if (riderError) throw riderError;
          riderProfile = riderData;
        }

        setInvoice({
          appointment: appointmentData,
          ride: rideData,
          patient: patientProfile,
          rider: riderProfile,
        });
      } catch (err: any) {
        console.error('Error fetching invoice:', err);
        setError(err.message || 'Failed to load invoice.');
      } finally {
        setLoading(false);
      }
    }

    fetchInvoice();
  }, [appointmentId]);

  if (loading) {
    return (
      <div className="p-6 text-center">
        <LoadingSpinner />
        <p className="mt-2 text-gray-600">Loading invoice...</p>
      </div>
    );
  }

  if (error) {
    return <div className="p-6 text-red-600">Error: {error}</div>;
  }

  if (!invoice) {
    return <div className="p-6 text-gray-600">No invoice details available.</div>;
  }

  const { appointment, ride, patient, rider } = invoice;

  return (
    <div className="p-6 max-w-3xl mx-auto bg-white rounded-xl shadow-lg my-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6 border-b pb-4">Invoice for Appointment #{appointment.id.substring(0, 8)}</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-3">Patient Details</h2>
          <p><strong>Name:</strong> {patient?.full_name || 'N/A'}</p>
          <p><strong>Phone:</strong> {patient?.phone || 'N/A'}</p>
          <p><strong>Pickup:</strong> {appointment.pickup_location}</p>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-3">Hospital Details</h2>
          <p><strong>Name:</strong> {appointment.hospital_name}</p>
          <p><strong>Address:</strong> {appointment.hospital_address}</p>
          <p><strong>Appointment Date:</strong> {format(new Date(appointment.appointment_date), 'PPP p')}</p>
        </div>
      </div>

      {rider && (
        <div className="mb-6 border-t pt-4">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">Rider Details</h2>
          <p><strong>Name:</strong> {rider.full_name}</p>
          <p><strong>Phone:</strong> {rider.phone || 'N/A'}</p>
          <p><strong>Rating:</strong> {rider.rating?.toFixed(1) || 'N/A'}</p>
        </div>
      )}

      {ride ? (
        <div className="border-t pt-4 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">Ride Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-gray-50 p-3 rounded-md">
              <p className="text-sm text-gray-600">Status</p>
              <p className="font-medium capitalize">{ride.status.replace('_', ' ')}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-md">
              <p className="text-sm text-gray-600">Distance</p>
              <p className="font-medium">{ride.distance_km?.toFixed(2) || '0.00'} km</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-md">
              <p className="text-sm text-gray-600">Duration</p>
              <p className="font-medium">{ride.duration_minutes || '0'} min</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-md">
              <p className="text-sm text-gray-600">Pickup Time</p>
              <p className="font-medium">{ride.pickup_time ? format(new Date(ride.pickup_time), 'PPP p') : 'N/A'}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-md">
              <p className="text-sm text-gray-600">Dropoff Time</p>
              <p className="font-medium">{ride.dropoff_time ? format(new Date(ride.dropoff_time), 'PPP p') : 'N/A'}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-md">
              <p className="text-sm text-gray-600">Completion Time</p>
              <p className="font-medium">{ride.completion_time ? format(new Date(ride.completion_time), 'PPP p') : 'N/A'}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="border-t pt-4 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">Ride Details</h2>
          <p className="text-gray-600">No ride associated with this appointment yet.</p>
        </div>
      )}

      <div className="border-t pt-4">
        <h2 className="text-xl font-semibold text-gray-800 mb-3">Fare Summary</h2>
        <div className="space-y-2">
          {ride && (
            <>
              <div className="flex justify-between">
                <p className="text-gray-700">Base Fare:</p>
                <p className="font-medium">Rs. {ride.base_fare?.toFixed(2) || '0.00'}</p>
              </div>
              <div className="flex justify-between">
                <p className="text-gray-700">Distance Fare:</p>
                <p className="font-medium">Rs. {ride.distance_fare?.toFixed(2) || '0.00'}</p>
              </div>
              <div className="flex justify-between">
                <p className="text-gray-700">Time Fare:</p>
                <p className="font-medium">Rs. {ride.time_fare?.toFixed(2) || '0.00'}</p>
              </div>
            </>
          )}
          <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2">
            <p className="text-gray-900">Total Fare:</p>
            <p className="text-gray-900">Rs. {appointment.total_cost?.toFixed(2) || '0.00'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}