// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.119.0'

const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY')

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

function uint8ArrayToBase64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

async function encryptPayload(plaintext: string, subscription: any, vapidPrivateKeyRaw: Uint8Array): Promise<{ encrypted: Uint8Array; salt: Uint8Array }> {
  const encoder = new TextEncoder()
  const ptBytes = encoder.encode(plaintext)

  const authRaw = subscription.getKey('auth')
  const p256dhRaw = subscription.getKey('p256dh')
  if (!authRaw || !p256dhRaw) throw new Error('Missing subscription keys')

  const salt = crypto.getRandomValues(new Uint8Array(16))

  const ecdhPrivateKey = await crypto.subtle.importKey(
    'pkcs8',
    vapidPrivateKeyRaw,
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  )

  const p256dhPublicKey = await crypto.subtle.importKey(
    'raw',
    p256dhRaw,
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    []
  )

  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: 'ECDH', public: p256dhPublicKey },
      ecdhPrivateKey,
      256
    )
  )

  const sharedSecretKey = await crypto.subtle.importKey(
    'raw',
    sharedSecret,
    { name: 'HKDF', hash: 'SHA-256' },
    false,
    ['deriveBits']
  )

  const prk = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: 'HKDF', hash: 'SHA-256', salt: authRaw, info: new Uint8Array(0) },
      sharedSecretKey,
      256
    )
  )

  const prkKey = await crypto.subtle.importKey(
    'raw',
    prk,
    { name: 'HKDF', hash: 'SHA-256' },
    false,
    ['deriveBits']
  )

  const keyLen = new Uint8Array([0x00, 0x10])
  const cekInfo = new Uint8Array([
    ...encoder.encode('Content-Encoding: aesgcm\0'),
    ...keyLen,
  ])
  const cek = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(0), info: cekInfo },
      prkKey,
      128
    )
  )

  const nonceLen = new Uint8Array([0x00, 0x0c])
  const nonceInfo = new Uint8Array([
    ...encoder.encode('Content-Encoding: nonce\0'),
    ...nonceLen,
  ])
  const nonce = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(0), info: nonceInfo },
      prkKey,
      96
    )
  )

  const cekKey = await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['encrypt'])
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, cekKey, ptBytes)
  )

  return { encrypted, salt }
}

async function sendPushSubscription(subscription: any, payload: any): Promise<void> {
  if (!VAPID_PRIVATE_KEY) throw new Error('VAPID_PRIVATE_KEY not configured')
  if (!VAPID_PUBLIC_KEY) throw new Error('VAPID_PUBLIC_KEY not configured')

  const vapidPrivateKeyRaw = urlBase64ToUint8Array(VAPID_PRIVATE_KEY)

  const ecdsaKey = await crypto.subtle.importKey(
    'pkcs8',
    vapidPrivateKeyRaw,
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign']
  )

  const headers = new Headers()
  headers.set('TTL', '86400')

  const url = new URL(subscription.endpoint)

  const authData = {
    audience: url.origin,
    expiresIn: 86400,
    subject: 'mailto:admin@sa-autocar.example',
  }

  const jwt = await generateJWT(authData, ecdsaKey)
  headers.set('Authorization', `WebPush ${jwt}`)

  const rawPublicKey = extractRawPublicKey(VAPID_PUBLIC_KEY)
  const encrypted = await encryptPayload(JSON.stringify(payload), subscription, vapidPrivateKeyRaw)

  headers.set('Encryption', `salt=${uint8ArrayToBase64Url(encrypted.salt)}`)
  headers.set('Crypto-Key', `p256ecdsa=${uint8ArrayToBase64Url(rawPublicKey)}`)

  const res = await fetch(subscription.endpoint, {
    method: 'POST',
    headers,
    body: encrypted.encrypted,
  })
  if (!res.ok) {
    throw new Error(`Push service responded ${res.status}`)
  }
}

async function generateJWT(payload: any, key: CryptoKey): Promise<string> {
  const header = btoa(JSON.stringify({ alg: 'ES256', typ: 'JWT' }))
  const body = btoa(JSON.stringify(payload))
  const signingInput = `${header}.${body}`

  const encoder = new TextEncoder()
  const data = encoder.encode(signingInput)
  const signature = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, data)
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

  return `${signingInput}.${sigB64}`
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: corsHeaders })
  }

  try {
    const { title, body, tag, data } = await req.json()

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: 'Missing Supabase config' }), { status: 500, headers: corsHeaders })
    }

    if (!VAPID_PRIVATE_KEY || !VAPID_PUBLIC_KEY) {
      return new Response(JSON.stringify({ error: 'Missing VAPID config' }), { status: 500, headers: corsHeaders })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const { data: subs, error: subError } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')

    if (subError) throw subError

    const notificationPayload = {
      title,
      body,
      tag: tag || 'booking-update',
      data: { url: '/', ...data },
    }

    const results = await Promise.allSettled(
      (subs ?? []).map(async (sub: any) => {
        const subscription: any = {
          endpoint: sub.endpoint,
          getKey: (name: string) => {
            const b64 = name === 'p256dh' ? sub.p256dh : sub.auth
            if (!b64) return null
            const raw = atob(b64)
            return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
          },
        }
        try {
          await sendPushSubscription(subscription, notificationPayload)
          return { endpoint: sub.endpoint, status: 'sent' }
        } catch (err: any) {
          return { endpoint: sub.endpoint, status: 'failed', error: err.message }
        }
      })
    )

    const successCount = results.filter((r) => r.status === 'fulfilled' && r.value.status === 'sent').length
    const failCount = results.filter((r) => r.status === 'rejected' || r.value.status === 'failed').length

    console.log(
      `Push sent: ${successCount}/${subs?.length ?? 0}, failed: ${failCount}`
    )
    console.log('Per-subscription results:', JSON.stringify(results))

    return new Response(
      JSON.stringify({ success: true, sent: successCount, failed: failCount, total: (subs ?? []).length, results }),
      { status: 200, headers: corsHeaders }
    )
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders })
  }
})
