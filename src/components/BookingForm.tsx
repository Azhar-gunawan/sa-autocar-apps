import { useState, useEffect } from 'react'
import { Plus, X, Calendar, Save, Edit2 } from 'lucide-react'
import { supabase, type Booking, type CarType } from '../lib/supabase'
import { formatRupiah } from '../lib/calendarUtils'

interface BookingFormProps {
  defaultDate: string
  carTypes: CarType[]
  onCreateBooking: (booking: Booking) => void
  onClose: () => void
  booking?: Booking
  onUpdateBooking?: (id: string, patch: Partial<Booking>) => void
}

export function BookingForm({ defaultDate, carTypes, onCreateBooking, onClose, booking, onUpdateBooking }: BookingFormProps) {
  const isEdit = !!booking
  const [customerName, setCustomerName] = useState(booking?.customer_name ?? '')
  const [carName, setCarName] = useState(booking?.car_name ?? '')
  const [plateNumber, setPlateNumber] = useState(booking?.plate_number ?? '')
  const [bookingTime, setBookingTime] = useState(booking?.booking_time ?? '')
  const [selectedCarType, setSelectedCarType] = useState<string | null>(booking?.car_type_id ?? null)
  const [notes, setNotes] = useState(booking?.notes ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showToast, setShowToast] = useState(false)
  const [customCategoryName, setCustomCategoryName] = useState('')
  const [customPrice, setCustomPrice] = useState('')

  const selectedType = carTypes.find((ct) => ct.id === selectedCarType)
  const isCustom = selectedCarType === 'custom'
  const price = isCustom ? (Number(customPrice.replace(/[^0-9]/g, '')) || 0) : (selectedType?.price ?? (booking?.price ?? 0))

  useEffect(() => {
    if (!isEdit) {
      const now = new Date()
      const hh = String(now.getHours()).padStart(2, '0')
      const mm = String(now.getMinutes()).padStart(2, '0')
      setBookingTime(`${hh}:${mm}`)
    }
  }, [isEdit])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!customerName.trim() && !carName.trim()) {
      setError('Nama pelanggan atau nama mobil wajib diisi.')
      return
    }
    if (!bookingTime) {
      setError('Jam wajib diisi.')
      return
    }

    setLoading(true)
    try {
      if (isEdit && booking && onUpdateBooking) {
        const patch: Partial<Booking> = {
          booking_date: defaultDate,
          booking_time: bookingTime,
          customer_name: customerName.trim(),
          car_name: carName.trim(),
          plate_number: plateNumber.trim() || null,
          car_type_id: selectedCarType || null,
          price,
          notes: notes.trim() || null,
        }
        const { error: updateError } = await supabase
          .from('bookings')
          .update(patch)
          .eq('id', booking.id)
        if (updateError) throw updateError
        onUpdateBooking(booking.id, patch)
      } else {
        const { data, error: insertError } = await supabase
          .from('bookings')
          .insert([{
            booking_date: defaultDate,
            booking_time: bookingTime,
            customer_name: customerName.trim(),
            car_name: carName.trim(),
            plate_number: plateNumber.trim() || null,
            car_type_id: selectedCarType || null,
            price,
            notes: notes.trim() || null,
            status: 'booking',
            user_id: null,
          }])
          .select()
          .single()
        if (insertError) throw insertError
        if (data) {
          onCreateBooking(data as Booking)
        }
      }

      setShowToast(true)
      setTimeout(() => {
        setShowToast(false)
        onClose()
      }, 2000)
    } catch (err: any) {
      setError(err.message || isEdit ? 'Gagal mengupdate booking.' : 'Gagal menyimpan booking.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="booking-form-title"
    >
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-md m-4 bg-white rounded-[2rem] shadow-2xl border border-border overflow-hidden flex flex-col animate-in zoom-in duration-300">
        <div className="px-6 py-5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-primary flex items-center justify-center text-white font-bold text-xs">
              {isEdit ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            </div>
            <h2 id="booking-form-title" className="text-base font-bold text-text tracking-tight">
              {isEdit ? 'Edit Booking' : 'Tambah Booking'}
            </h2>
          </div>
          <button type="button" onClick={onClose} className="p-2 text-text-muted hover:bg-gray-100 rounded-xl transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          {error && (
            <div className="rounded-xl bg-danger/50 p-3 text-danger text-sm border border-danger/20">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">
                Tanggal
              </label>
              <div className="flex items-center gap-2.5 pl-3 pr-4 py-2.5 bg-gray-50 rounded-xl border border-gray-200 text-text">
                <Calendar className="w-4 h-4 text-text-muted shrink-0" />
                <span className="ml-1 text-sm font-medium">{defaultDate}</span>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">
                Jam
              </label>
              <input
                type="time"
                value={bookingTime}
                onChange={(e) => setBookingTime(e.target.value)}
                required
                className="w-full px-3 py-2.5 rounded-xl border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary transition-all"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">
                Nama Pelanggan
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Nama pelanggan"
                className="w-full px-3 py-2.5 rounded-xl border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary transition-all"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">
                Nama Mobil
              </label>
              <input
                type="text"
                value={carName}
                onChange={(e) => setCarName(e.target.value)}
                placeholder="Nama mobil"
                className="w-full px-3 py-2.5 rounded-xl border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary transition-all"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">
                Plat Nomor
              </label>
              <input
                type="text"
                value={plateNumber}
                onChange={(e) => setPlateNumber(e.target.value)}
                placeholder="B 1234 ABC"
                className="w-full px-3 py-2.5 rounded-xl border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary transition-all"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">
                Kategori
              </label>
              <select
                value={selectedCarType ?? ''}
                onChange={(e) => setSelectedCarType(e.target.value || null)}
                className="w-full px-3 py-2.5 rounded-xl border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary transition-all appearance-none"
              >
                <option value="">Pilih kategori</option>
                {carTypes.map((ct) => (
                  <option key={ct.id} value={ct.id}>
                    {ct.name} - {formatRupiah(ct.price)}
                  </option>
                ))}
                <option value="custom">Lainnya (Input Sendiri)</option>
              </select>
              {selectedType && (
                <p className="mt-1 text-[10px] text-text-muted">
                  Harga: {formatRupiah(selectedType.price)}
                </p>
              )}
              {isCustom && (
                <div className="mt-3 space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">
                      Nama Kategori
                    </label>
                    <input
                      type="text"
                      value={customCategoryName}
                      onChange={(e) => setCustomCategoryName(e.target.value)}
                      placeholder="Contoh: Cuci Reguler"
                      className="w-full px-3 py-2.5 rounded-xl border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">
                      Harga (RP)
                    </label>
                    <input
                      type="text"
                      value={customPrice}
                      onChange={(e) => setCustomPrice(e.target.value)}
                      placeholder="Contoh: 50000"
                      className="w-full px-3 py-2.5 rounded-xl border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="col-span-2">
              <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">
                Keterangan
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Catatan tambahan (opsional)"
                rows={2}
                className="w-full px-3 py-2.5 rounded-xl border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary transition-all"
              />
            </div>
          </div>

          <div className="mt-2 flex items-center justify-end gap-3 pt-5 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-text font-medium bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl text-white font-semibold bg-primary hover:bg-primary-600 disabled:bg-gray-300 transition-colors shadow-lg flex items-center gap-2"
            >
              {loading ? (
                <Save className="w-4 h-4" />
              ) : (
                <Edit2 className="w-4 h-4" />
              )}
              {isEdit ? 'Update' : 'Simpan'}
            </button>
          </div>
        </form>

        {showToast && (
          <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-primary text-white shadow-2xl border border-primary/20">
            <Edit2 className="w-5 h-5 text-success" />
            <span className="text-sm font-medium">{isEdit ? 'Booking berhasil diupdate' : 'Booking berhasil ditambahkan'}</span>
          </div>
        )}
      </div>
    </div>
  )
}
