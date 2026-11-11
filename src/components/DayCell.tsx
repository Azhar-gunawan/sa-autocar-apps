import { format, isToday } from 'date-fns'

interface DayCellProps {
  date: Date
  bookingsCount: number
  hasBooking: boolean
  isSelected: boolean
  onSelect: (date: Date) => void
}

export function DayCell({ date, bookingsCount, hasBooking, isSelected, onSelect }: DayCellProps) {
  const dayNumber = format(date, 'd')
  const today = isToday(date)

  return (
    <button
      type="button"
      onClick={() => onSelect(date)}
      className={`flex flex-col items-center justify-center aspect-square rounded-2xl border border-transparent transition-all duration-200 ${
        isSelected
          ? 'bg-primary-50 border-primary text-primary font-bold shadow-sm'
          : today
            ? 'bg-primary text-white font-bold shadow-sm'
            : hasBooking
              ? 'bg-[#dbeafe] border-[#3b82f6] text-[#3b82f6] font-bold'
              : 'bg-white border-transparent hover:bg-gray-50 hover:border-gray-200'
      } text-text`}
      aria-label={format(date, 'dd MMMM yyyy')}
    >
      <span className="text-sm font-medium leading-none">{dayNumber}</span>
      {hasBooking && !isSelected && (
        <div className="mt-1 flex items-center gap-1 text-[10px]">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#3b82f6] text-white text-[10px] font-bold">
            {bookingsCount}
          </span>
        </div>
      )}
      {today && !isSelected && !hasBooking && (
        <span className="mt-1 w-1.5 h-1.5 rounded-full bg-success" />
      )}
    </button>
  )
}
