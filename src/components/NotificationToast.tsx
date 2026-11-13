import { useEffect } from 'react'
import { X, Bell, Clock } from 'lucide-react'

interface NotificationToastProps {
  notification: {
    id: string
    title: string
    body: string
    type: 'create' | 'update' | 'delete'
    createdAt: string
  }
  onDismiss: () => void
}

export function NotificationToast({ notification, onDismiss }: NotificationToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(), 7000)
    return () => clearTimeout(timer)
  }, [onDismiss])

  const typeConfig: Record<string, { color: string; icon: any; label: string }> = {
    create: { color: 'bg-success', icon: Bell, label: 'Booking Baru' },
    update: { color: 'bg-warning', icon: Clock, label: 'Booking Diupdate' },
    delete: { color: 'bg-danger', icon: X, label: 'Booking Dihapus' },
  }
  const config = typeConfig[notification.type]
  const Icon = config.icon

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      <div className="pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-lg border border-border bg-white toast-enter min-w-[260px]">
        <div className={`${config.color} w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <div className="flex justify-between items-start">
            <h4 className="font-semibold text-text">{config.label}</h4>
            <button onClick={onDismiss} className="text-text-muted hover:text-text p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="font-bold text-text mt-1">{notification.title}</p>
          <p className="text-sm text-text-muted mt-1 leading-relaxed">{notification.body}</p>
        </div>
      </div>
    </div>
  )
}
