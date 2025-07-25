-- Enable UUID generation extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table - matches your backend expectations
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  email_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_login TIMESTAMPTZ
);

-- Verification codes table - matches your backend usage
CREATE TABLE IF NOT EXISTS verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Password resets table - matches your backend usage
CREATE TABLE IF NOT EXISTS password_resets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- VM creation logs table - matches your backend structure
CREATE TABLE IF NOT EXISTS vm_creation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  box_name TEXT NOT NULL,
  vm_name TEXT NOT NULL,
  cpus INT NOT NULL,
  memory INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  terraform_output TEXT,
  logs JSONB, -- For storing frontend log entries
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security (but make it permissive for your custom JWT auth)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_resets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vm_creation_logs ENABLE ROW LEVEL SECURITY;

-- Permissive RLS policies since you're using custom JWT authentication
-- Users table policies
CREATE POLICY "Allow all operations on users" ON public.users
FOR ALL USING (true) WITH CHECK (true);

-- Verification codes table policies  
CREATE POLICY "Allow all operations on verification_codes" ON public.verification_codes
FOR ALL USING (true) WITH CHECK (true);

-- Password resets table policies
CREATE POLICY "Allow all operations on password_resets" ON public.password_resets
FOR ALL USING (true) WITH CHECK (true);

-- VM creation logs table policies
CREATE POLICY "Allow all operations on vm_creation_logs" ON public.vm_creation_logs
FOR ALL USING (true) WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_id ON users(id);
CREATE INDEX IF NOT EXISTS idx_verification_codes_email ON verification_codes(email);
CREATE INDEX IF NOT EXISTS idx_verification_codes_expires_at ON verification_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_verification_codes_created_at ON verification_codes(created_at);
CREATE INDEX IF NOT EXISTS idx_password_resets_email ON password_resets(email);
CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token);
CREATE INDEX IF NOT EXISTS idx_password_resets_expires_at ON password_resets(expires_at);
CREATE INDEX IF NOT EXISTS idx_password_resets_created_at ON password_resets(created_at);
CREATE INDEX IF NOT EXISTS idx_vm_creation_logs_user_email ON vm_creation_logs(user_email);
CREATE INDEX IF NOT EXISTS idx_vm_creation_logs_created_at ON vm_creation_logs(created_at);