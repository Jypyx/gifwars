import type { Side } from '../game/types'
import { assetUrl } from './urls'

export type NoticeKind = 'start' | 'reminder' | 'victory' | 'defeat'
const MESSAGES: Record<NoticeKind, { title: string; body: string; tag: string }> = {
  start: { title: 'GIF WARS · ARENA READY', body: 'Le duel commence. Déploie ton premier Gif !', tag: 'match-start' },
  reminder: { title: 'GIF WARS · À TOI DE JOUER', body: 'Ton adversaire attend ta pose dans l’arène.', tag: 'turn-reminder' },
  victory: { title: 'GIF WARS · VICTOIRE', body: 'La ligne ennemie a cédé. Bien joué !', tag: 'match-result' },
  defeat: { title: 'GIF WARS · DÉFAITE', body: 'Ta ligne est tombée. Prêt pour la revanche ?', tag: 'match-result' }
}

export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator
}

export async function requestNotifications(): Promise<boolean> {
  if (!notificationsSupported()) return false
  return (await Notification.requestPermission()) === 'granted'
}

export async function notify(kind: NoticeKind): Promise<boolean> {
  if (!notificationsSupported() || Notification.permission !== 'granted') return false
  const message = MESSAGES[kind]
  try {
    const registration = await navigator.serviceWorker.ready
    await registration.showNotification(message.title, {
      body: message.body, tag: message.tag, icon: assetUrl('icons/icon-192.png'),
      badge: assetUrl('icons/icon-192.png'), data: { url: assetUrl('') }
    })
    return true
  } catch { return false }
}

function base64UrlToBytes(key: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - key.length % 4) % 4)
  const binary = atob((key + padding).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(binary, character => character.charCodeAt(0))
}

/** Optional online Push channel. Requires a VAPID key and a subscription API. */
export async function subscribeToPush(): Promise<'subscribed' | 'unconfigured' | 'unsupported' | 'denied'> {
  const key = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined
  const endpoint = import.meta.env.VITE_PUSH_SUBSCRIBE_URL as string | undefined
  if (!key || !endpoint) return 'unconfigured'
  if (!notificationsSupported() || !('PushManager' in window)) return 'unsupported'
  if (!await requestNotifications()) return 'denied'
  const registration = await navigator.serviceWorker.ready
  const existing = await registration.pushManager.getSubscription()
  const subscription = existing ?? await registration.pushManager.subscribe({
    userVisibleOnly: true, applicationServerKey: base64UrlToBytes(key)
  })
  const response = await fetch(endpoint, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subscription)
  })
  if (!response.ok) throw new Error(`Abonnement Push refusé (${response.status}).`)
  return 'subscribed'
}

export function outcomeNotice(winner: Side): NoticeKind { return winner === 'player' ? 'victory' : 'defeat' }
