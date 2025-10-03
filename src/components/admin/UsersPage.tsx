import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Appointment, Earning, Profile, Ride } from '../../lib/database.types';
import { LoadingSpinner } from '../ui/LoadingSpinner';

type TableName = 'profiles' | 'appointments' | 'rides' | 'earnings';

export function UsersPage() {
  const [activeTable, setActiveTable] = useState<TableName>('profiles');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [rides, setRides] = useState<Ride[]>([]);
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    try {
      setLoading(true);
      setError(null);
      const [{ data: p }, { data: a }, { data: r }, { data: e }] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('appointments').select('*').order('created_at', { ascending: false }),
        supabase.from('rides').select('*').order('created_at', { ascending: false }),
        supabase.from('earnings').select('*').order('created_at', { ascending: false }),
      ]);
      setProfiles(p || []);
      setAppointments(a || []);
      setRides(r || []);
      setEarnings(e || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  const rows = useMemo(() => {
    switch (activeTable) {
      case 'profiles': return profiles;
      case 'appointments': return appointments;
      case 'rides': return rides;
      case 'earnings': return earnings;
    }
  }, [activeTable, profiles, appointments, rides, earnings]);

  const remove = async (id: string) => {
    const confirmDelete = window.confirm('Delete row?');
    if (!confirmDelete) return;
    setLoading(true);
    setError(null);
    const { error } = await supabase.from(activeTable).delete().eq('id', id);
    if (error) setError(error.message);
    await loadAll();
  };

  const save = async (row: any) => {
    setLoading(true);
    setError(null);
    const { error } = await supabase.from(activeTable).update(row).eq('id', row.id);
    if (error) setError(error.message);
    await loadAll();
  };

  if (loading) return <div className="p-6"><LoadingSpinner /></div>;
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Admin Data Browser</h1>
        <div className="space-x-2">
          {(['profiles', 'appointments', 'rides', 'earnings'] as TableName[]).map(t => (
            <button
              key={t}
              onClick={() => setActiveTable(t)}
              className={`px-3 py-2 rounded border ${activeTable === t ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-800 border-gray-200'}`}
            >{t}</button>
          ))}
        </div>
      </div>
      {error && <div className="mb-3 text-red-600">{error}</div>}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="divide-y">
          {(rows as any[]).map((row) => (
            <EditableRow key={row.id} row={row} onSave={save} onDelete={remove} />
          ))}
        </div>
      </div>
    </div>
  );
}

function EditableRow({ row, onSave, onDelete }: { row: any; onSave: (row: any) => void; onDelete: (id: string) => void }) {
  const [edit, setEdit] = useState(false);
  const [draft, setDraft] = useState<any>(row);
  const entries = Object.entries(draft) as [string, any][];

  return (
    <div className="p-3">
      {!edit ? (
        <div className="flex justify-between items-center">
          <pre className="text-xs whitespace-pre-wrap break-words">{JSON.stringify(row, null, 2)}</pre>
          <div className="space-x-2">
            <button onClick={() => setEdit(true)} className="px-3 py-1 rounded bg-blue-600 text-white">Edit</button>
            <button onClick={() => onDelete(row.id)} className="px-3 py-1 rounded bg-red-600 text-white">Delete</button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map(([k, v]) => (
            <div key={k} className="grid grid-cols-4 gap-2 items-center">
              <label className="text-sm text-gray-700 col-span-1">{k}</label>
              <input
                className="col-span-3 border rounded px-2 py-1 text-sm"
                value={v ?? ''}
                onChange={(e) => setDraft({ ...draft, [k]: e.target.value })}
              />
            </div>
          ))}
          <div className="space-x-2">
            <button onClick={() => { onSave(draft); setEdit(false); }} className="px-3 py-1 rounded bg-green-600 text-white">Save</button>
            <button onClick={() => { setDraft(row); setEdit(false); }} className="px-3 py-1 rounded bg-gray-200">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}



