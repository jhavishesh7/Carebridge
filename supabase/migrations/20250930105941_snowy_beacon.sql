/*
  # Fix RLS policies for profiles table

  1. Security Updates
    - Remove recursive admin policy that causes infinite loop
    - Simplify policies to avoid circular dependencies
    - Add proper policies for user management

  2. Changes
    - Drop existing problematic policies
    - Create new non-recursive policies
    - Ensure users can read their own profiles
    - Allow profile updates by owners
*/

-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Create new policies without recursion
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- For admin access, we'll handle this in the application layer
-- rather than in RLS policies to avoid recursion