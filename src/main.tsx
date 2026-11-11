import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.tsx'

registerSW({ onNeedRefresh: () => {}, onOfflineReady: () => {} })

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw-push.js').catch((err) => {
    console.warn('Push SW registration failed:', err)
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
