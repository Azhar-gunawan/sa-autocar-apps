const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY

if (!vapidPublicKey) {
  console.warn('VITE_VAPID_PUBLIC_KEY tidak diatur, push notifikasi tidak akan berfungsi')
}

export const VAPID_PUBLIC_KEY = vapidPublicKey ?? ''

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

function extractRawPublicKey(b64url: string): Uint8Array {
  const bytes = urlBase64ToUint8Array(b64url)
  if (bytes.length === 65 && bytes[0] === 0x04) return bytes
  for (let i = 0; i < bytes.length - 3; i++) {
    if (bytes[i] === 0x03 && bytes[i + 2] === 0x00) {
      const start = i + 3
      if (bytes[start] === 0x04 && start + 65 <= bytes.length) {
        return bytes.slice(start, start + 65)
      }
    }
  }
  throw new Error('Invalid VAPID public key: expected raw 65-byte key or SPKI DER')
}

export async function subscribeToPush(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Browser tidak mendukung push notifikasi')
    return null
  }

  try {
    const registration = await navigator.serviceWorker.ready
    const existing = await registration.pushManager.getSubscription()
    if (existing) return existing

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: extractRawPublicKey(VAPID_PUBLIC_KEY) as BufferSource,
    })
    return subscription
  } catch (err) {
    console.error('Gagal subscribe push:', err)
    return null
  }
}

export async function unsubscribeFromPush(): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    if (!subscription) return true
    return await subscription.unsubscribe()
  } catch (err) {
    console.error('Gagal unsubscribe push:', err)
    return false
  }
}

export function subscriptionToJSON(sub: PushSubscription): any {
  const p256dh = sub.getKey('p256dh')
  const auth = sub.getKey('auth')
  const keys = {
    p256dh: p256dh ? btoa(String.fromCharCode(...new Uint8Array(p256dh))) : '',
    auth: auth ? btoa(String.fromCharCode(...new Uint8Array(auth))) : '',
  }
  return {
    endpoint: sub.endpoint,
    keys,
    expirationTime: sub.expirationTime,
  }
}

export async function saveSubscriptionToSupabase(sub: PushSubscription): Promise<void> {
  const { supabase } = await import('../lib/supabase')
  const payload = subscriptionToJSON(sub)
  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      endpoint: payload.endpoint,
      p256dh: payload.keys.p256dh,
      auth: payload.keys.auth,
      user_id: null,
    },
    { onConflict: 'endpoint' }
  )
  if (error) console.error('Gagal simpan subscription ke DB:', error)
}

export async function removeSubscriptionFromSupabase(endpoint: string): Promise<void> {
  const { supabase } = await import('../lib/supabase')
  const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint)
  if (error) console.error('Gagal hapus subscription dari DB:', error)
}
