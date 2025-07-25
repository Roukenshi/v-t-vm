import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Only keep types you use in the frontend for typing props or state.

export interface User {
  id: string
  email: string
  created_at: string
  email_verified?: boolean
  last_login?: string
  registration_domain?: string
}

export interface VMCreationLog {
  id: string
  user_id: string
  box_name: string
  vm_name: string
  cpus: number
  memory: number
  status: 'pending' | 'success' | 'error';
  logs: any[];
  terraform_output: string | null;
  created_at: string
}

// Backend response format
export interface  VMLogBackendResponse{
  id: string;
  user_email: string;
  box_name: string;
  vm_name: string;
  cpus: number;
  memory: number;
  status:  string;
  terraform_output: string | null;
  logs: any[] | null;
  created_at: string;
}
