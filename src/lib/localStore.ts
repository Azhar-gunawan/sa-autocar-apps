import type { CarType, Booking } from './supabase'

const STORAGE_KEY_BOOKINGS = 'sa_autocar_bookings'
const STORAGE_KEY_CAR_TYPES = 'sa_autocar_car_types'

const DEFAULT_CAR_TYPES: CarType[] = [
  { id: 'ct-1', name: 'Mobil Biasa', price: 170000, active: true, created_at: new Date().toISOString() },
  { id: 'ct-2', name: 'Mobil Besar', price: 200000, active: true, created_at: new Date().toISOString() },
]

export function loadCarTypes(): CarType[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CAR_TYPES)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch {
    // ignore
  }
  saveCarTypes(DEFAULT_CAR_TYPES)
  return [...DEFAULT_CAR_TYPES]
}

export function saveCarTypes(carTypes: CarType[]) {
  localStorage.setItem(STORAGE_KEY_CAR_TYPES, JSON.stringify(carTypes))
}

export function loadBookings(): Booking[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_BOOKINGS)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed
    }
  } catch {
    // ignore
  }
  return []
}

export function saveBookings(bookings: Booking[]) {
  localStorage.setItem(STORAGE_KEY_BOOKINGS, JSON.stringify(bookings))
}

export function addBooking(booking: Omit<Booking, 'id' | 'created_at' | 'updated_at'>) {
  const bookings = loadBookings()
  const now = new Date().toISOString()
  const newBooking: Booking = {
    ...booking,
    id: crypto.randomUUID(),
    created_at: now,
    updated_at: now,
  }
  bookings.push(newBooking)
  saveBookings(bookings)
  return newBooking
}

export function updateBooking(id: string, patch: Partial<Booking>) {
  const bookings = loadBookings()
  const idx = bookings.findIndex((b) => b.id === id)
  if (idx === -1) return null
  bookings[idx] = { ...bookings[idx], ...patch, updated_at: new Date().toISOString() }
  saveBookings(bookings)
  return bookings[idx]
}

export function deleteBooking(id: string) {
  const bookings = loadBookings().filter((b) => b.id !== id)
  saveBookings(bookings)
}
