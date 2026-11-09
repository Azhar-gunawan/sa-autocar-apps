import { useState, useEffect } from 'react'

export function SplashScreen({ onFinish }: { onFinish: () => void }) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false)
      onFinish()
    }, 2200)
    return () => clearTimeout(timer)
  }, [onFinish])

  if (!visible) return null

  return (
    <div
      className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center transition-opacity duration-700"
    >
      <div className="relative inline-block animate-bounce-slow">
        <img
          src="/logo.png"
          alt="SA AUTOCAR"
          className="w-48 h-48 object-contain drop-shadow-2xl animate-pulse-slow"
          loading="eager"
        onError={(e) => {
          const target = e.target as HTMLImageElement
          target.style.display = 'none'
        }}
        />
        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-primary animate-ping" />
      </div>
      <div className="mt-6 text-2xl font-bold text-text tracking-tight">
        SA AUTOCAR
      </div>
      <div className="mt-1 text-sm text-text-muted uppercase tracking-widest">
        Wash and Engine
      </div>
    </div>
  )
}
