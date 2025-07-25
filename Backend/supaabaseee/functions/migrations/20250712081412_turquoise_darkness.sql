/*
  # Authentication and VM Management Schema

  1. New Tables
    - `users`
      - `id` (uuid, primary key)
      - `email` (text, unique)
      - `created_at` (timestamp)
      - `last_login` (timestamp)
    
    - `verification_codes`
      - `id` (uuid, primary key)
      - `email` (text)
      - `code` (text)
      - `expires_at` (timestamp)
      - `used` (boolean)
      - `created_at` (timestamp)
    
    - `vm_creation_logs`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `box_name` (text)
      - `vm_name` (text)
      - `cpus` (integer)
      - `memory` (integer)
      - `status` (text)
      - `logs` (jsonb)
      - `terraform_output` (text)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
    - Add policies for verification codes
*/

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  last_login timestamptz
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Verification codes table
CREATE TABLE IF NOT EXISTS verification_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  code text NOT NULL,
  expires_at timestamptz NOT NULL,
  used boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE verification_codes ENABLE ROW LEVEL SECURITY;

-- VM creation logs table
CREATE TABLE IF NOT EXISTS vm_creation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  box_name text NOT NULL,
  vm_name text NOT NULL,
  cpus integer NOT NULL DEFAULT 2,
  memory integer NOT NULL DEFAULT 2048,
  status text NOT NULL DEFAULT 'pending',
  logs jsonb DEFAULT '[]'::jsonb,
  terraform_output text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE vm_creation_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- RLS Policies for verification codes (allow reading for verification)
CREATE POLICY "Anyone can read verification codes for verification"
  ON verification_codes
  FOR SELECT
  TO anon, authenticated
  USING (expires_at > now() AND NOT used);

CREATE POLICY "Anyone can insert verification codes"
  ON verification_codes
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update verification codes"
  ON verification_codes
  FOR UPDATE
  TO anon, authenticated
  USING (true);

-- RLS Policies for VM logs
CREATE POLICY "Users can read own VM logs"
  ON vm_creation_logs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own VM logs"
  ON vm_creation_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own VM logs"
  ON vm_creation_logs
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_verification_codes_email ON verification_codes(email);
CREATE INDEX IF NOT EXISTS idx_verification_codes_code ON verification_codes(code);
CREATE INDEX IF NOT EXISTS idx_vm_logs_user_id ON vm_creation_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_vm_logs_created_at ON vm_creation_logs(created_at);