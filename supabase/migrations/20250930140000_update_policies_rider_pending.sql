/*
  Allow riders to:
  - See pending appointments with no rider assigned
  - Claim a pending appointment by setting rider_id to self and status to 'accepted'
  - Keep existing permissions for updating own accepted/in_progress rides
*/

-- Read pending unassigned appointments
CREATE POLICY IF NOT EXISTS "Riders can view pending unassigned appointments"
  ON appointments FOR SELECT
  TO authenticated
  USING (
    status = 'pending' AND rider_id IS NULL
  );

-- Claim a pending ride (set rider_id to self and status to accepted)
CREATE POLICY IF NOT EXISTS "Riders can claim pending appointments"
  ON appointments FOR UPDATE
  TO authenticated
  USING (
    status = 'pending' AND rider_id IS NULL
  )
  WITH CHECK (
    rider_id = auth.uid() AND status IN ('accepted','in_progress')
  );


