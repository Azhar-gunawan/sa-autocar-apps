import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, format, isSameDay, getDaysInMonth } from 'date-fns'
import { id } from 'date-fns/locale'

export function generateCalendarDays(year: number, month: number) {
  const monthStart = startOfMonth(new Date(year, month))
  const monthEnd = endOfMonth(new Date(year, month))
  const weekStart = startOfWeek(monthStart, { locale: id, weekStartsOn: 1 })
  const weekEnd = endOfWeek(monthEnd, { locale: id, weekStartsOn: 1 })

  return eachDayOfInterval({ start: weekStart, end: weekEnd })
}

export function formatMonthYear(date: Date) {
  return format(date, 'MMMM yyyy', { locale: id })
}

export function formatDay(date: Date) {
  return format(date, 'd', { locale: id })
}

export function formatWeekday(date: Date) {
  return format(date, 'EEE', { locale: id })
}

export function isSameMonth(dateA: Date, dateB: Date) {
  return dateA.getMonth() === dateB.getMonth() && dateA.getFullYear() === dateB.getFullYear()
}

export function formatTime24(dateStr: string) {
  return dateStr
}

export function formatTimeDisplay(time24: string) {
  if (!time24) return ''
  const [hours, minutes] = time24.split(':')
  const h = parseInt(hours, 10)
  const period = h >= 12 ? 'PM' : 'AM'
  const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${displayHour}:${minutes} ${period}`
}

export function formatRupiah(amount: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function aggregateDayBookings(bookings: any[], targetDate: Date) {
  const dayBookings = bookings.filter((b) => isSameDay(new Date(b.booking_date), targetDate))
  const activeBookings = dayBookings.filter((b) => b.status !== 'batal')
  const totalCars = activeBookings.length
  const totalRevenue = activeBookings.reduce((sum, b) => sum + (b.price || 0), 0)
  const sorted = [...activeBookings].sort((a, b) => a.booking_time.localeCompare(b.booking_time))
  return { dayBookings, activeBookings, totalCars, totalRevenue, sorted }
}

export function getMonthDaysCount(year: number, month: number) {
  return getDaysInMonth(new Date(year, month))
}

export const WEEKDAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu']
