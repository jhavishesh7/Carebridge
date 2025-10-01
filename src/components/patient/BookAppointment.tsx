import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { useNavigate } from 'react-router-dom';
import { estimateFromAddresses, computeFare } from '../../lib/fare';

export function BookAppointment() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    hospital_name: '',
    hospital_address: '',
    appointment_date: '',
    estimated_duration: '2 hours',
    special_instructions: '',
    pickup_location: '',
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [quote, setQuote] = useState<{ distanceKm: number; durationMin: number; total: number } | null>(null);
  const [acceptedQuote, setAcceptedQuote] = useState(false);

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    if (!quote) {
      setErrorMsg('Please estimate the fare and accept it before booking.');
      return;
    }
    if (!acceptedQuote) {
      setErrorMsg('Please accept the fare to proceed.');
      return;
    }
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const { error } = await supabase.from('appointments').insert({
        patient_id: profile.id,
        rider_id: null,
        hospital_name: form.hospital_name,
        hospital_address: form.hospital_address,
        appointment_date: new Date(form.appointment_date).toISOString(),
        estimated_duration: form.estimated_duration,
        special_instructions: form.special_instructions || null,
        status: 'pending',
        pickup_location: form.pickup_location,
        total_cost: quote.total,
      });

      if (error) throw error;
      navigate('/appointments');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to book appointment');
    } finally {
      setSubmitting(false);
    }
  };

  const estimate = async () => {
    setErrorMsg(null);
    setQuote(null);
    try {
      const est = await estimateFromAddresses(form.pickup_location, form.hospital_address);
      if (!est) {
        setErrorMsg('Could not estimate route. Please adjust addresses.');
        return;
      }
      const roundKm = Math.round(est.distanceKm * 2 * 100) / 100;
      const roundMin = Math.round(est.durationMinutes * 2);
      const fare = computeFare(roundKm, roundMin);
      setQuote({ distanceKm: roundKm, durationMin: roundMin, total: fare.total });
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to estimate');
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Book New Appointment</h1>
      <form onSubmit={onSubmit} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 max-w-2xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hospital Name</label>
            <input name="hospital_name" value={form.hospital_name} onChange={onChange} required className="w-full border rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hospital Address</label>
            <input name="hospital_address" value={form.hospital_address} onChange={onChange} required className="w-full border rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Appointment Date & Time</label>
            <input type="datetime-local" name="appointment_date" value={form.appointment_date} onChange={onChange} required className="w-full border rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Location</label>
            <input name="pickup_location" value={form.pickup_location} onChange={onChange} required className="w-full border rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Duration</label>
            <input name="estimated_duration" value={form.estimated_duration} onChange={onChange} className="w-full border rounded-lg px-3 py-2" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Special Instructions</label>
            <textarea name="special_instructions" value={form.special_instructions} onChange={onChange} rows={3} className="w-full border rounded-lg px-3 py-2" />
          </div>
        </div>

        {/* Fare estimation */}
        <div className="mt-6 p-4 rounded-lg border bg-gray-50">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold text-gray-900">Fare Estimate</div>
              <div className="text-sm text-gray-600">Round trip with assistance fee</div>
            </div>
            <button type="button" onClick={estimate} className="bg-indigo-600 text-white px-3 py-2 rounded-lg hover:bg-indigo-700">Get Estimate</button>
          </div>
          {quote && (
            <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div className="bg-white border rounded p-3">
                <div className="text-gray-500">Distance</div>
                <div className="font-semibold">{quote.distanceKm.toFixed(2)} km</div>
              </div>
              <div className="bg-white border rounded p-3">
                <div className="text-gray-500">Duration</div>
                <div className="font-semibold">{quote.durationMin} min</div>
              </div>
              <div className="bg-white border rounded p-3">
                <div className="text-gray-500">Estimated Fare</div>
                <div className="font-semibold">Rs. {quote.total.toFixed(2)}</div>
              </div>
              <div className="md:col-span-3">
                <label className="inline-flex items-center space-x-2">
                  <input type="checkbox" checked={acceptedQuote} onChange={e => setAcceptedQuote(e.target.checked)} />
                  <span className="text-gray-700">I accept the fare and wish to book this appointment.</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Map preview via OSM static iframe when we have an estimate */}
        {quote && (
          <div className="mt-4">
            <div className="text-sm text-gray-600 mb-2">Route preview (OpenStreetMap)</div>
            <iframe
              title="route-map"
              src={`https://www.openstreetmap.org/export/embed.html?layer=mapnik&marker=0,0`}
              className="w-full h-64 border rounded"
            />
            <div className="text-xs text-gray-500 mt-1">Note: Interactive map can be enhanced later; fare already uses OSM routing.</div>
          </div>
        )}
        {errorMsg && <p className="text-red-600 mt-4">{errorMsg}</p>}
        <div className="mt-6 flex items-center space-x-3">
          <button type="submit" disabled={submitting} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-60">
            {submitting ? <LoadingSpinner size="sm" /> : 'Book Appointment'}
          </button>
          <button type="button" onClick={() => navigate(-1)} className="bg-gray-100 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-200">Cancel</button>
        </div>
      </form>
    </div>
  );
}


