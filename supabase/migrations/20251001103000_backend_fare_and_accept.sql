-- Server-side fare computation and accept ride RPCs
-- Safe to re-run: use CREATE OR REPLACE for functions

-- Compute fare breakdown given round-trip distance and duration
create or replace function public.compute_fare_breakdown(
  p_distance_km numeric,
  p_duration_min numeric,
  p_assistance_enhanced boolean default false
)
returns table (
  base_fare numeric,
  distance_fare numeric,
  time_fare numeric,
  assistance_fee numeric,
  total numeric
) language plpgsql as $$
declare
  v_base constant numeric := 80;         -- Rs
  v_rate_dist constant numeric := 40;    -- Rs/km
  v_rate_time constant numeric := 6;     -- Rs/min
  v_assist_standard constant numeric := 150;
  v_assist_enhanced constant numeric := 300;
begin
  base_fare := v_base;
  distance_fare := round(p_distance_km * v_rate_dist::numeric, 2);
  time_fare := round(p_duration_min * v_rate_time::numeric, 2);
  assistance_fee := case when p_assistance_enhanced then v_assist_enhanced else v_assist_standard end;
  total := round(base_fare + distance_fare + time_fare + assistance_fee, 2);
  return next;
end;$$;

-- Accept ride and persist fare + metrics into rides and appointments
create or replace function public.accept_ride_with_fare(
  p_appointment_id uuid,
  p_rider_id uuid,
  p_distance_km numeric,
  p_duration_min numeric,
  p_assistance_enhanced boolean default false
)
returns table (
  ride_id uuid,
  appointment_id uuid,
  total numeric
) language plpgsql security definer as $$
declare
  v_base numeric;
  v_distance numeric;
  v_time numeric;
  v_assist numeric;
  v_total numeric;
  v_patient uuid;
begin
  -- Ensure appointment exists and is pending
  select a.patient_id into v_patient
  from public.appointments a
  where a.id = p_appointment_id and a.status = 'pending'
  for update;

  if v_patient is null then
    raise exception 'Appointment not found or not pending';
  end if;

  -- Compute fare breakdown
  select base_fare, distance_fare, time_fare, assistance_fee, total
  into v_base, v_distance, v_time, v_assist, v_total
  from public.compute_fare_breakdown(p_distance_km, p_duration_min, p_assistance_enhanced);

  -- Insert ride row
  insert into public.rides (
    appointment_id,
    patient_id,
    rider_id,
    status,
    distance_km,
    duration_minutes,
    base_fare,
    distance_fare,
    time_fare,
    total_fare,
    created_at,
    updated_at
  ) values (
    p_appointment_id,
    v_patient,
    p_rider_id,
    'accepted',
    p_distance_km,
    p_duration_min,
    v_base,
    v_distance,
    v_time,
    v_total,
    now(),
    now()
  ) returning id into ride_id;

  -- Update appointment state and cached total
  update public.appointments
  set rider_id = p_rider_id,
      status = 'accepted',
      total_cost = v_total,
      updated_at = now()
  where id = p_appointment_id;

  appointment_id := p_appointment_id;
  total := v_total;
  return next;
end;$$;

-- Grant execute to anon and authenticated (adjust as needed)
grant execute on function public.compute_fare_breakdown(numeric, numeric, boolean) to anon, authenticated;
grant execute on function public.accept_ride_with_fare(uuid, uuid, numeric, numeric, boolean) to anon, authenticated;


