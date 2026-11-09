import { useState } from 'react'
import { Plus, Car, X, Trash2, RefreshCw, Check, Edit2 } from 'lucide-react'
import { BookingForm } from './BookingForm'
import { formatTimeDisplay, formatRupiah, aggregateDayBookings } from '../lib/calendarUtils'
import type { Booking, CarType } from '../lib/supabase'

interface BookingItemProps {
  booking: Booking
  onStatusChange: (id: string, status: string) => void
  onEdit: (booking: Booking) => void
  onDelete: (id: string) => void
}

function BookingItem({ booking, onStatusChange, onEdit, onDelete }: BookingItemProps) {
  const handleStatusChange = async () => {
    const next = booking.status === 'booking' ? 'selesai' : 'booking'
    onStatusChange(booking.id, next)
  }

  const handleDelete = async () => {
    if (!window.confirm('Hapus booking ini?')) return
    onDelete(booking.id)
  }

  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-border bg-white shadow-sm">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold text-primary">{formatTimeDisplay(booking.booking_time)}</span>
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
              booking.status === 'booking'
                ? 'bg-blue-50 text-blue-700 border border-blue-100'
                : 'bg-success/10 text-success-700 border border-success/20'
            }`}
          >
            {booking.status === 'booking' ? 'Booking' : 'Selesai'}
          </span>
        </div>
        <div className="text-sm font-semibold text-text truncate">{booking.car_name}</div>
        <div className="text-xs text-text-muted truncate">
          {booking.customer_name} {booking.plate_number ? ' · ' + booking.plate_number : ''}
        </div>
        {booking.notes && (
          <div className="mt-1 text-xs text-text-muted truncate max-w-[200px]">{booking.notes}</div>
        )}
        <div className="mt-1 text-xs text-text-muted">
          {booking.car_type_id ? booking.price ? formatRupiah(booking.price) : '-' : '-'}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleStatusChange}
          className="p-2 rounded-xl text-text-muted hover:bg-gray-100 transition-colors"
          title="Ubah status"
        >
          {booking.status === 'selesai' ? (
            <Check className="w-4 h-4 text-success" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
        </button>
        <button
          type="button"
          onClick={() => onEdit(booking)}
          className="p-2 rounded-xl text-text-muted hover:bg-blue-50 hover:text-blue-600 transition-colors"
          title="Edit"
        >
          <Edit2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={handleDelete}
          className="p-2 rounded-xl text-text-muted hover:bg-red-50 hover:text-red-600 transition-colors"
          title="Hapus"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

interface DayDetailProps {
  selectedDate: Date | null
  bookings: Booking[]
  carTypes: CarType[]
  onCreateBooking: (booking: Booking) => void
  onUpdateBooking: (id: string, patch: Partial<Booking>) => void
  onDeleteBooking: (id: string) => void
  onDateChange: (date: Date | null) => void
}

export function DayDetail({
  selectedDate,
  bookings,
  carTypes,
  onCreateBooking,
  onUpdateBooking,
  onDeleteBooking,
  onDateChange,
}: DayDetailProps) {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null)

  if (!selectedDate) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-text-muted py-24">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
          <Car className="w-8 h-8 text-gray-400" />
        </div>
        <p className="text-sm font-medium text-text">Pilih tanggal di kalender</p>
        <p className="text-xs text-text-muted mt-1">untuk melihat detail booking</p>
      </div>
    )
  }

  const { totalCars, totalRevenue, sorted } = aggregateDayBookings(bookings, selectedDate)
  const dateLabel = selectedDate.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const monthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
  const monthEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0)
  const monthBookings = bookings.filter((b) => {
    const d = new Date(b.booking_date)
    return d >= monthStart && d <= monthEnd && b.status !== 'batal'
  })
  const monthCars = monthBookings.length
  const monthRevenue = monthBookings.reduce((sum, b) => sum + (b.price || 0), 0)

  return (
    <div className="flex-1 overflow-y-auto p-5">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-text">{dateLabel}</h2>
          <p className="text-sm text-text-muted">
            {totalCars} mobil · {formatRupiah(totalRevenue)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onDateChange(null)}
            className="px-3 py-2 rounded-xl text-text font-medium bg-gray-100 hover:bg-gray-200 transition-colors text-sm"
          >
            <X className="w-3 h-3 mr-1.5" /> Kembali
          </button>
          <button
            type="button"
            onClick={() => setIsFormOpen(true)}
            className="px-5 py-2.5 rounded-xl text-white font-semibold bg-primary hover:bg-primary-600 transition-colors shadow-md flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Tambah mobil
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Jumlah mobil (hari ini)</p>
          <p className="text-3xl font-bold text-text mt-1">{totalCars}</p>
        </div>
        <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Total pendapatan (hari ini)</p>
          <p className="text-3xl font-bold text-text mt-1">{formatRupiah(totalRevenue)}</p>
        </div>
        <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Jumlah mobil (bulan ini)</p>
          <p className="text-3xl font-bold text-text mt-1">{monthCars}</p>
        </div>
        <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Total pendapatan (bulan ini)</p>
          <p className="text-3xl font-bold text-text mt-1">{formatRupiah(monthRevenue)}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
        {sorted.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <Car className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-sm text-text-muted font-medium">Belum ada booking pada tanggal ini.</p>
            <p className="text-xs text-gray-400 mt-1">Klik tombol "+ Tambah mobil" untuk membuat booking baru.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {sorted.map((booking) => (
              <BookingItem
                key={booking.id}
                booking={booking}
                onStatusChange={(id, status) => onUpdateBooking(id, { status: status as Booking['status'] })}
                onEdit={() => {
                  setEditingBooking(booking)
                  setIsFormOpen(true)
                }}
                onDelete={(id) => onDeleteBooking(id)}
              />
            ))}
          </div>
        )}
      </div>

      {isFormOpen && (
        <BookingForm
          defaultDate={selectedDate.toISOString().split('T')[0]}
          carTypes={carTypes}
          booking={editingBooking ?? undefined}
          onCreateBooking={(booking) => onCreateBooking(booking)}
          onUpdateBooking={(id, patch) => onUpdateBooking(id, patch)}
          onClose={() => {
            setIsFormOpen(false)
            setEditingBooking(null)
          }}
        />
      )}
    </div>
  )
}
