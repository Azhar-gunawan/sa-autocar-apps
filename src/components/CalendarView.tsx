import { useState } from 'react'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react'
import { DayCell } from './DayCell'
import {
  generateCalendarDays,
  formatMonthYear,
  WEEKDAYS,
} from '../lib/calendarUtils'
import { format, isSameDay } from 'date-fns'

interface CalendarViewProps {
  bookings: any[]
  onDateSelect: (date: Date) => void
  selectedDate: Date | null
}

export function CalendarView({ bookings, onDateSelect, selectedDate }: CalendarViewProps) {
  const [viewDate, setViewDate] = useState(new Date())

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const days = generateCalendarDays(year, month)

  const prevMonth = () => {
    setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold text-text tracking-tight">{formatMonthYear(viewDate)}</h2>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={prevMonth}
            className="p-2.5 rounded-xl text-text-muted hover:bg-gray-100 transition-colors"
            aria-label="Bulan sebelumnya"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={nextMonth}
            className="p-2.5 rounded-xl text-text-muted hover:bg-gray-100 transition-colors"
            aria-label="Bulan berikutnya"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 px-4">
        {WEEKDAYS.map((day) => (
          <div key={day} className="text-[10px] font-semibold text-text-muted text-center uppercase tracking-wider">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 px-4">
        {days.map((day) => {
          const dayBookings = bookings.filter((b) => {
            const bDate = new Date(b.booking_date)
            return bDate.getDate() === day.getDate() && bDate.getMonth() === day.getMonth() && bDate.getFullYear() === day.getFullYear()
          })
          const active = dayBookings.filter((b) => b.status !== 'batal')
          const isSelected = selectedDate ? isSameDay(day, selectedDate) : false

          return (
            <DayCell
              key={format(day, 'yyyy-MM-dd')}
              date={day}
              bookingsCount={active.length}
              hasBooking={active.length > 0}
              isSelected={isSelected}
              onSelect={onDateSelect}
            />
          )
        })}
      </div>
    </div>
  )
}
