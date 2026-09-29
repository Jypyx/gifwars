/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core'
import { precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { createHandlerBoundToURL } from 'workbox-precaching'

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: Array<{ url: string; revision?: string }> }

self.skipWaiting()
clientsClaim()
precacheAndRoute(self.__WB_MANIFEST)
registerRoute(new NavigationRoute(createHandlerBoundToURL('/index.html')))

interface PushPayload { title?: string; body?: string; tag?: string; url?: string }
self.addEventListener('push', event => {
  let payload: PushPayload = {}
  try { payload = event.data?.json() as PushPayload ?? {} } catch { payload = { body: event.data?.text() ?? '' } }
  event.waitUntil(self.registration.showNotification(payload.title ?? 'GIF WARS · NOUVEAU DÉFI', {
    body: payload.body ?? 'Une partie t’attend dans l’arène !',
    tag: payload.tag ?? 'gifwars-push', icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png', data: { url: payload.url ?? '/' }
  }))
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const target = new URL((event.notification.data as { url?: string } | undefined)?.url ?? '/', self.location.origin)
  if (target.origin !== self.location.origin) return
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const existing = windows.find(client => new URL(client.url).pathname === target.pathname)
    if (existing) return existing.focus()
    return self.clients.openWindow(target.href)
  })())
})
