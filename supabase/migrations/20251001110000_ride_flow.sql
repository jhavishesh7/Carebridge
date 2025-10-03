-- Ride flow support: flags for dual-completion and helper RPCs + notifications

-- Add completion flags if not exist
do $$ begin
  alter table public.rides add column if not exists rider_completed boolean not null default false;
exception when duplicate_column then null; end $$;

do $$ begin
  alter table public.rides add column if not exists patient_completed boolean not null default false;
exception when duplicate_column then null; end $$;

-- Helper function to create a notification
create or replace function public.create_notification(
  p_user_id uuid,
  p_title text,
  p_message text,
  p_type text default 'info'
) returns void language plpgsql security definer as $$
begin
  insert into public.notifications(user_id, title, message, type, is_read, created_at)
  values (p_user_id, p_title, p_message, coalesce(p_type, 'info'), false, now());
end;$$;

grant execute on function public.create_notification(uuid, text, text, text) to anon, authenticated;

-- Record a ride status update and notify patient and rider
create or replace function public.mark_ride_step(
  p_ride_id uuid,
  p_status text,
  p_notes text default null,
  p_location text default null
) returns void language plpgsql security definer as $$
declare
  v_patient uuid;
  v_rider uuid;
begin
  -- persist status update
  insert into public.ride_status_updates(ride_id, status, notes, location, created_at)
  values (p_ride_id, p_status::text, p_notes, p_location, now());

  -- update ride primary status
  update public.rides set status = p_status::text, updated_at = now() where id = p_ride_id;

  select patient_id, rider_id into v_patient, v_rider from public.rides where id = p_ride_id;

  -- notify both parties
  perform public.create_notification(v_patient, 'Ride Update', 'Status changed to ' || p_status, 'ride');
  perform public.create_notification(v_rider, 'Ride Update', 'Status changed to ' || p_status, 'ride');
end;$$;

grant execute on function public.mark_ride_step(uuid, text, text, text) to anon, authenticated;

-- Mark rider completion; if both sides completed, finalize appointment
create or replace function public.mark_rider_complete(p_ride_id uuid)
returns void language plpgsql security definer as $$
declare
  v_appt uuid;
  v_patient uuid;
  v_both boolean;
begin
  update public.rides set rider_completed = true, status = 'completed', updated_at = now() where id = p_ride_id;
  select appointment_id, patient_id, (rider_completed and patient_completed) into v_appt, v_patient, v_both from public.rides where id = p_ride_id;
  perform public.create_notification(v_patient, 'Ride Completed', 'Rider marked ride as completed', 'ride');
  if v_both then
    update public.appointments set status = 'completed', updated_at = now() where id = v_appt;
  end if;
end;$$;

grant execute on function public.mark_rider_complete(uuid) to anon, authenticated;

-- Mark patient completion; if both sides completed, finalize appointment
create or replace function public.mark_patient_complete(p_ride_id uuid)
returns void language plpgsql security definer as $$
declare
  v_appt uuid;
  v_rider uuid;
  v_both boolean;
begin
  update public.rides set patient_completed = true, updated_at = now() where id = p_ride_id;
  select appointment_id, rider_id, (rider_completed and patient_completed) into v_appt, v_rider, v_both from public.rides where id = p_ride_id;
  perform public.create_notification(v_rider, 'Ride Completed', 'Patient marked ride as completed', 'ride');
  if v_both then
    update public.appointments set status = 'completed', updated_at = now() where id = v_appt;
  end if;
end;$$;

grant execute on function public.mark_patient_complete(uuid) to anon, authenticated;


