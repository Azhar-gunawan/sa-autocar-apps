import { useState, useEffect } from 'react'
import { CalendarView } from './components/CalendarView'
import { DayDetail } from './components/DayDetail'
import { SplashScreen } from './components/SplashScreen'
import { supabase, type CarType, type Booking } from './lib/supabase'

function App() {
  const [carTypes, setCarTypes] = useState<CarType[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [splashFinished, setSplashFinished] = useState(false)

  useEffect(() => {
    let mounted = true

    const loadData = async () => {
      try {
        const [carTypesRes, bookingsRes] = await Promise.all([
          supabase.from('car_types').select('*').eq('active', true).order('name'),
          supabase.from('bookings').select('*').order('booking_date', { ascending: true }),
        ])

        if (!mounted) return
        if (carTypesRes.error) throw carTypesRes.error
        if (bookingsRes.error) throw bookingsRes.error

        setCarTypes(carTypesRes.data ?? [])
        setBookings(bookingsRes.data ?? [])
      } catch (err) {
        console.error('Gagal memuat data:', err)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadData()
    return () => {
      mounted = false
    }
  }, [])

  const handleCreateBooking = (booking: Booking) => {
    setBookings((prev) => [...prev, booking])
  }

  const handleUpdateBooking = async (id: string, patch: Partial<Booking>) => {
    try {
      const { data, error } = await supabase.from('bookings').update(patch).eq('id', id).select().single()
      if (error) throw error
      if (data) {
        setBookings((prev) => prev.map((b) => (b.id === id ? data as Booking : b)))
      }
    } catch (err) {
      console.error('Gagal mengupdate booking:', err)
    }
  }

  const handleDeleteBooking = async (id: string) => {
    try {
      const { error } = await supabase.from('bookings').delete().eq('id', id)
      if (error) throw error
      setBookings((prev) => prev.filter((b) => b.id !== id))
    } catch (err) {
      console.error('Gagal menghapus booking:', err)
    }
  }

  if (!splashFinished) {
    return (
      <div className="flex-1 flex flex-col">
        <SplashScreen onFinish={() => setSplashFinished(true)} />
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-text-muted py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-3" />
        <p className="text-sm">Memuat data...</p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-bg-muted">
      <header className="border-b border-border bg-white/80 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-primary flex items-center justify-center text-white font-bold text-sm shadow-lg">
              S
            </div>
            <span className="font-bold text-text text-lg tracking-tight">SA AUTOCAR</span>
          </div>
          <div className="text-xs text-text-muted font-medium">
            {new Date().toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-hidden">
        <div className="flex flex-col lg:flex-row h-full min-h-0">
          <aside className="flex-1 lg:w-1/3 border-b lg:border-b-0 lg:border-r border-border bg-white overflow-y-auto p-5 shrink-0 min-h-0">
            <CalendarView
              bookings={bookings}
              onDateSelect={(date) => setSelectedDate(date)}
              selectedDate={selectedDate}
            />
          </aside>
          <main className="flex-1 bg-bg-muted overflow-y-auto min-h-0">
            <DayDetail
              selectedDate={selectedDate}
              bookings={bookings}
              carTypes={carTypes}
              onCreateBooking={handleCreateBooking}
              onUpdateBooking={handleUpdateBooking}
              onDeleteBooking={handleDeleteBooking}
              onDateChange={(date) => setSelectedDate(date)}
            />
          </main>
        </div>
      </div>
    </div>
  )
}

export default App
