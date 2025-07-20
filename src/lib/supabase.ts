import { createClient } from '@supabase/supabase-js'

const supabaseURL = import.meta.env.VITE_SUPABASE_URL|| 'https://placeholder.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder_anon_key_here'

export const supabase = createClient( supabaseURL, supabaseAnonKey )

//Database types
export interface User {
    id: string
    email: string
    created_at: string
    last_login: string
}

export interface VMCreationLog {
    id: string
    user_id: string
    box_name: string
    vm_name: string
    cpus: string
    memory: string
    status: 'success' | 'error' | 'pending'
    logs:  any[]
    terraform_output?: string
    created_at: string
}

export interface VerificationCode {
    id: string
    email: string
    code: string
    expires_at: string
    used: boolean
    created_at: string
}

export interface PasswordRest{
    id: string
    email: string
    token: string
    expires_at: string
    used: boolean
    created_at: string
}