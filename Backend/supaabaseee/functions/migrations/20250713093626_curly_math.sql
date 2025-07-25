/*
  # Add Password Authentication Support

  1. New Tables
    - `password_resets`
      - `id` (uuid, primary key)
      - `email` (text)
      - `token` (text)
      - `expires_at` (timestamp)
      - `used` (boolean)
      - `created_at` (timestamp)

  2. Table Updates
    - Add `password_hash` column to users table
    - Add `email_verified` column to users table
    - Add `registration_domain` column to users table

  3. Security
    - Enable RLS on password_resets table
    - Add policies for password reset functionality
*/

-- Add password and verification columns to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'password_hash'
  ) THEN
    ALTER TABLE users ADD COLUMN password_hash text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'email_verified'
  ) THEN
    ALTER TABLE users ADD COLUMN email_verified boolean DEFAULT false;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'registration_domain'
  ) THEN
    ALTER TABLE users ADD COLUMN registration_domain text;
  END IF;
END $$;

-- Password resets table
CREATE TABLE IF NOT EXISTS password_resets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  token text NOT NULL,
  expires_at timestamptz NOT NULL,
  used boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE password_resets ENABLE ROW LEVEL SECURITY;

-- RLS Policies for password resets
CREATE POLICY "Anyone can read password reset tokens for verification"
  ON password_resets
  FOR SELECT
  TO anon, authenticated
  USING (expires_at > now() AND NOT used);

CREATE POLICY "Anyone can insert password reset requests"
  ON password_resets
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update password reset tokens"
  ON password_resets
  FOR UPDATE
  TO anon, authenticated
  USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_password_resets_email ON password_resets(email);
CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token);
CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email_verified);