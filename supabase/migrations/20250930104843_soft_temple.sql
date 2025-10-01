/*
  # CareBridge Healthcare Mobility Platform Schema

  1. New Tables
    - `profiles` - User profiles with role-based information
    - `appointments` - Medical appointments and ride requests
    - `rides` - Active and completed rides with status tracking  
    - `earnings` - Rider earnings and payment tracking
    - `notifications` - System notifications for all users
    - `ride_status_updates` - Real-time ride status tracking

  2. Security
    - Enable RLS on all tables
    - Add policies for role-based access control
    - Secure data access based on user roles and ownership

  3. Features
    - Real-time ride tracking
    - Healthcare-specific appointment management
    - Earnings and payment system
    - Comprehensive admin controls
*/

-- Create custom types
CREATE TYPE user_role AS ENUM ('patient', 'rider', 'admin');
CREATE TYPE appointment_status AS ENUM ('pending', 'accepted', 'in_progress', 'completed', 'cancelled');
CREATE TYPE ride_status AS ENUM ('requested', 'accepted', 'pickup', 'en_route', 'at_hospital', 'in_appointment', 'returning', 'completed', 'cancelled');

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  full_name text NOT NULL,
  phone text,
  address text,
  date_of_birth date,
  emergency_contact text,
  medical_conditions text,
  avatar_url text,
  is_verified boolean DEFAULT false,
  rating numeric(3,2) DEFAULT 5.0,
  total_rides integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  rider_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  hospital_name text NOT NULL,
  hospital_address text NOT NULL,
  appointment_date timestamptz NOT NULL,
  estimated_duration interval DEFAULT '2 hours',
  special_instructions text,
  status appointment_status DEFAULT 'pending',
  pickup_location text NOT NULL,
  total_cost numeric(10,2),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Rides table
CREATE TABLE IF NOT EXISTS rides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid REFERENCES appointments(id) ON DELETE CASCADE NOT NULL,
  patient_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  rider_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status ride_status DEFAULT 'accepted',
  pickup_time timestamptz,
  dropoff_time timestamptz,
  return_pickup_time timestamptz,
  completion_time timestamptz,
  distance_km numeric(8,2),
  duration_minutes integer,
  base_fare numeric(10,2) DEFAULT 15.00,
  distance_fare numeric(10,2) DEFAULT 0,
  time_fare numeric(10,2) DEFAULT 0,
  total_fare numeric(10,2),
  patient_notes text,
  rider_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Earnings table
CREATE TABLE IF NOT EXISTS earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  ride_id uuid REFERENCES rides(id) ON DELETE CASCADE NOT NULL,
  amount numeric(10,2) NOT NULL,
  commission numeric(10,2) DEFAULT 0,
  net_amount numeric(10,2) NOT NULL,
  payment_status text DEFAULT 'pending',
  paid_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text DEFAULT 'info',
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Ride status updates table
CREATE TABLE IF NOT EXISTS ride_status_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id uuid REFERENCES rides(id) ON DELETE CASCADE NOT NULL,
  status ride_status NOT NULL,
  notes text,
  location text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE rides ENABLE ROW LEVEL SECURITY;
ALTER TABLE earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE ride_status_updates ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can read all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Appointments policies
CREATE POLICY "Patients can manage own appointments"
  ON appointments FOR ALL
  TO authenticated
  USING (patient_id = auth.uid());

CREATE POLICY "Riders can view accepted appointments"
  ON appointments FOR SELECT
  TO authenticated
  USING (
    rider_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Riders can update accepted appointments"
  ON appointments FOR UPDATE
  TO authenticated
  USING (rider_id = auth.uid());

-- Rides policies
CREATE POLICY "Users can view own rides"
  ON rides FOR SELECT
  TO authenticated
  USING (
    patient_id = auth.uid() OR 
    rider_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Riders can update own rides"
  ON rides FOR UPDATE
  TO authenticated
  USING (rider_id = auth.uid());

-- Earnings policies
CREATE POLICY "Riders can view own earnings"
  ON earnings FOR SELECT
  TO authenticated
  USING (
    rider_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Notifications policies
CREATE POLICY "Users can view own notifications"
  ON notifications FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- Ride status updates policies
CREATE POLICY "Users can view ride status updates"
  ON ride_status_updates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM rides r 
      WHERE r.id = ride_id AND (
        r.patient_id = auth.uid() OR 
        r.rider_id = auth.uid()
      )
    ) OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Riders can add status updates"
  ON ride_status_updates FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM rides r 
      WHERE r.id = ride_id AND r.rider_id = auth.uid()
    )
  );

-- Indexes for performance
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_appointments_patient ON appointments(patient_id);
CREATE INDEX idx_appointments_rider ON appointments(rider_id);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_rides_patient ON rides(patient_id);
CREATE INDEX idx_rides_rider ON rides(rider_id);
CREATE INDEX idx_rides_status ON rides(status);
CREATE INDEX idx_earnings_rider ON earnings(rider_id);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);