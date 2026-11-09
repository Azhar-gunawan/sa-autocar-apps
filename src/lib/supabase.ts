import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase environment variables tidak lengkap. Isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY di .env',
  )
}

export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '')

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
