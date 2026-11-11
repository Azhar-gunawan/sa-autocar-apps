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

async function sendPushSubscription(subscription: any, payload: any): Promise<void> {
  const applicationServerKey = urlBase64ToUint8Array(VAPID_PRIVATE_KEY)

  const headers = new Headers()
  headers.set('TTL', '86400')
  headers.set('Content-Type', 'application/json')

  const url = new URL(subscription.endpoint)

  const authData = {
    audience: url.origin,
    expiresIn: 86400,
    subject: 'mailto:admin@sa-autocar.example',
  }

  const keyData = await crypto.subtle.importKey(
    'pkcs8',
    applicationServerKey,
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign']
  )

  const jwt = await generateJWT(authData, keyData)
  headers.set('Authorization', `WebPush ${jwt}`)
  headers.set('Crypto-Key', `p256ecdsa=${VAPID_PUBLIC_KEY}`)

  const body = JSON.stringify(payload)

  try {
    const res = await fetch(subscription.endpoint, {
      method: 'POST',
      headers,
      body,
    })
    if (!res.ok) {
      throw new Error(`Push service responded ${res.status}`)
    }
  } catch (err) {
    console.error('Push send error:', err)
    throw err
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
      `Push sent: ${successCount}/${subs?.length ?? 0}, failed: ${failCount}, VAPID set: ${!!VAPID_PRIVATE_KEY && !!VAPID_PUBLIC_KEY}`
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
