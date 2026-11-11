import { useState } from 'react'
import { Bell, CheckCircle2 } from 'lucide-react'
import {
  subscribeToPush,
  saveSubscriptionToSupabase,
  unsubscribeFromPush,
  removeSubscriptionFromSupabase,
  VAPID_PUBLIC_KEY,
} from '../lib/push'

interface PushPermissionDialogProps {
  open: boolean
  onClose: () => void
  onSubscribe?: () => void
}

export function PushPermissionDialog({ open, onClose, onSubscribe }: PushPermissionDialogProps) {
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)

  if (!open) return null

  const handleEnable = async () => {
    if (!VAPID_PUBLIC_KEY) {
      onClose()
      return
    }
    setLoading(true)
    try {
      const subscription = await subscribeToPush()
      if (subscription) {
        await saveSubscriptionToSupabase(subscription)
        setSubscribed(true)
        onSubscribe?.()
      }
    } catch (err) {
      console.error('Push enable error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDisable = async () => {
    setLoading(true)
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      if (subscription) {
        await removeSubscriptionFromSupabase(subscription.endpoint)
        await unsubscribeFromPush()
      }
      setSubscribed(false)
    } catch (err) {
      console.error('Push disable error:', err)
    } finally {
      setLoading(false)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl border border-border p-6 max-w-md w-full mx-4 flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <Bell className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-text text-lg">Aktifkan Notifikasi</h3>
            <p className="text-sm text-text-muted mt-1">
              Terima notifikasi setiap ada booking baru, diupdate, atau dihapus.
            </p>
          </div>
        </div>

        {subscribed ? (
          <div className="flex items-center gap-3 py-4">
            <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center text-success">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-text">Notifikasi aktif</h4>
              <p className="text-sm text-text-muted">Anda akan menerima notifikasi push untuk setiap perubahan booking.</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3 py-4">
            <button
              onClick={handleEnable}
              disabled={loading}
              className="w-full px-5 py-3 rounded-xl text-white font-semibold bg-primary hover:bg-primary-600 disabled:bg-gray-300 transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <svg className="w-4 h-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <Bell className="w-4 h-4" />
              )}
              {loading ? 'Mengaktifkan...' : 'Aktifkan Notifikasi'}
            </button>
            <button
              onClick={onClose}
              className="w-full px-5 py-3 rounded-xl text-text font-medium bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              Nanti saja
            </button>
          </div>
        )}

        <button
          onClick={handleDisable}
          className={`px-5 py-3 rounded-xl font-medium transition-colors ${subscribed ? 'text-red-600 bg-red-50 hover:bg-red-100' : 'text-text-muted bg-gray-50 hover:bg-gray-200'}`}
        >
          {subscribed ? 'Matikan Notifikasi' : 'Tutup'}
        </button>
      </div>
    </div>
  )
}
