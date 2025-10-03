import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

export type RideStatusModalState = {
  open: boolean;
  apptId: string | null;
};

type RideStatusHookProps = {
  userId: string | null;
  isPatient: boolean;
  rideModal: RideStatusModalState;
  setRideModal: (state: RideStatusModalState) => void;
};

export function useRideStatusUpdates({ userId, isPatient, rideModal, setRideModal }: RideStatusHookProps) {
  useEffect(() => {
    if (!userId) return;

    // Subscribe to appointment changes for auto-popup
    const channel = supabase
      .channel(`realtime:${isPatient ? 'patient' : 'rider'}-appointments`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'appointments',
          filter: `${isPatient ? 'patient_id' : 'rider_id'}=eq.${userId}`,
        },
        (payload: { new: any; old: any }) => {
          const newRow = payload.new;
          const oldRow = payload.old;

          // Auto-open if status moves to in_progress
          if (
            newRow.status === 'in_progress' && 
            oldRow.status === 'accepted' &&
            !rideModal.open
          ) {
            try {
              const updatedAt = new Date(newRow.updated_at).getTime();
              // Only auto-open if update was recent (within last 10 seconds)
              if (Date.now() - updatedAt < 10000) {
                setRideModal({ open: true, apptId: newRow.id });
              }
            } catch {
              // Ignore date parsing errors
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, isPatient, rideModal.open]);
}
