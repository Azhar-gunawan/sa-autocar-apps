import { useState, useEffect } from 'react'
import { CalendarView } from './components/CalendarView'
import { DayDetail } from './components/DayDetail'
import { PushPermissionDialog } from './components/PushPermissionDialog'
import { NotificationToast } from './components/NotificationToast'
import { Bell } from 'lucide-react'
import { supabase, type CarType, type Booking } from './lib/supabase'

const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-push`

async function sendPushNotification(title: string, body: string, tag: string, data?: any) {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`
    }
    const res = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({ title, body, tag, data }),
    })
    const result = await res.json().catch(() => ({}))
    if (!res.ok) {
      console.error('Edge function error:', result)
    } else {
      console.log('Push response:', result)
    }
  } catch (err) {
    console.error('Gagal mengirim notifikasi push:', err)
  }
}

function App() {
  const [carTypes, setCarTypes] = useState<CarType[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [pushDialogOpen, setPushDialogOpen] = useState(false)
  const [notifications, setNotifications] = useState<{
    id: string
    title: string
    body: string
    type: 'create' | 'update' | 'delete'
    createdAt: string
  }[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  function addNotification(title: string, body: string, type: 'create' | 'update' | 'delete') {
    const id = crypto.randomUUID()
    const notification = { id, title, body, type, createdAt: new Date().toISOString() }
    setNotifications((prev) => [notification, ...prev].slice(0, 50))
    setUnreadCount((prev) => prev + 1)
    sendPushNotification(title, body, type)
  }

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

        const { data: subs } = await supabase.from('push_subscriptions').select('id').limit(1)
        if (subs && subs.length > 0) setIsSubscribed(true)
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

  useEffect(() => {
    const channel = supabase
      .channel('bookings-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
        },
        (payload) => {
          const { eventType, new: record, old: recordOld } = payload as any
          if (eventType === 'INSERT' && record) {
            addNotification(
              'Booking Baru',
              `Booking ${record.car_name} untuk ${record.customer_name} pada ${record.booking_date}`,
              'create'
            )
          } else if (eventType === 'UPDATE' && record) {
            addNotification(
              'Booking Diupdate',
              `Status booking ${record.car_name} telah diperbarui.`,
              'update'
            )
          } else if (eventType === 'DELETE' && recordOld) {
            addNotification(
              'Booking Dihapus',
              'Sebuah booking telah dihapus.',
              'delete'
            )
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const refreshData = async () => {
    try {
      const [carTypesRes, bookingsRes] = await Promise.all([
        supabase.from('car_types').select('*').eq('active', true).order('name'),
        supabase.from('bookings').select('*').order('booking_date', { ascending: true }),
      ])
      if (carTypesRes.error) throw carTypesRes.error
      if (bookingsRes.error) throw bookingsRes.error
      setCarTypes(carTypesRes.data ?? [])
      setBookings(bookingsRes.data ?? [])
    } catch (err) {
      console.error('Gagal merefresh data:', err)
    }
  }

  const handleCreateBooking = (booking: Booking) => {
    setBookings((prev) => [...prev, booking])
    refreshData()
    addNotification(
      'Booking Baru',
      `Booking ${booking.car_name} untuk ${booking.customer_name} pada ${booking.booking_date}`,
      'create'
    )
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
    } finally {
      refreshData()
      addNotification(
        'Booking Diupdate',
        'Status booking Anda telah diperbarui.',
        'update'
      )
    }
  }

  const handleDeleteBooking = async (id: string) => {
    try {
      const { error } = await supabase.from('bookings').delete().eq('id', id)
      if (error) throw error
      setBookings((prev) => prev.filter((b) => b.id !== id))
    } catch (err) {
      console.error('Gagal menghapus booking:', err)
    } finally {
      refreshData()
      addNotification(
        'Booking Dihapus',
        'Sebuah booking telah dihapus.',
        'delete'
      )
    }
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
            <img src="/logo.png" alt="SA AUTOCAR" className="w-14 h-14 rounded-2xl object-contain" />
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

      <PushPermissionDialog
        open={pushDialogOpen}
        onClose={() => setPushDialogOpen(false)}
        onSubscribe={() => {
          setPushDialogOpen(false)
          setIsSubscribed(true)
        }}
      />

      <button
        type="button"
        onClick={() => setPushDialogOpen(true)}
        className={`fixed top-4 right-4 z-50 p-3 rounded-full ${isSubscribed ? 'bg-success text-white' : 'bg-primary text-white'} shadow-lg hover:${isSubscribed ? 'bg-success-600' : 'bg-primary-600'} transition-colors relative`}
        title="Pengaturan Notifikasi"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-5 h-5 rounded-full bg-danger text-white text-xs font-bold flex items-center justify-center border-2 border-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {notifications.map((n) => (
        <NotificationToast
          key={n.id}
          notification={n}
          onDismiss={() => {
            setNotifications((prev) => prev.filter((t) => t.id !== n.id))
            setUnreadCount((prev) => Math.max(0, prev - 1))
          }}
        />
      ))}
    </div>
  )
}

export default App
