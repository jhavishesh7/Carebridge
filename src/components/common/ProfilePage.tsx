import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

export function ProfilePage() {
  const { profile, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [address, setAddress] = useState(profile?.address ?? '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setFullName(profile?.full_name ?? '');
    setPhone(profile?.phone ?? '');
    setAddress(profile?.address ?? '');
  }, [profile?.id]);

  const save = async () => {
    if (!profile) return;
    try {
      setSaving(true);
      setMessage(null);
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName, phone, address, updated_at: new Date().toISOString() })
        .eq('id', profile.id);
      if (error) throw error;
      await refreshProfile();
      setMessage('Profile updated');
    } catch (e: any) {
      setMessage(e?.message || 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  if (!profile) return null;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Profile</h1>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 max-w-xl">
        {message && (
          <div className="mb-4 text-sm text-gray-700">{message}</div>
        )}
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-700 mb-1">Full Name</label>
            <input value={fullName} onChange={e => setFullName(e.target.value)} className="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Phone</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} className="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Address</label>
            <input value={address} onChange={e => setAddress(e.target.value)} className="w-full border rounded px-3 py-2" />
          </div>
          <div className="pt-2">
            <button disabled={saving} onClick={save} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


