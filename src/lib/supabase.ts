import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? 'https://axvpouvgappjjghxuu0nh.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? 'sb_publishable_NFfDtNEz0330X4bndhv6mA_NL3HcHO9'

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase environment variables tidak lengkap')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type BookingStatus = 'booking' | 'selesai' | 'batal'

export interface CarType {
  id: string
  name: string
  price: number
  active: boolean
  created_at: string
}

export interface Booking {
  id: string
  booking_date: string
  booking_time: string
  customer_name: string
  car_name: string
  plate_number: string | null
  car_type_id: string | null
  price: number
  notes: string | null
  status: BookingStatus
  user_id: string | null
  created_at: string
  updated_at: string
}
