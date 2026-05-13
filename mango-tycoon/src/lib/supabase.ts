import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

const url = (import.meta.env.VITE_SUPABASE_URL as string) || 'https://placeholder.supabase.co'
const key = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || 'placeholder'

export const supabase = createClient<Database>(url, key)
