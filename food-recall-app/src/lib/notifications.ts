export function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return Promise.resolve(false)
  if (Notification.permission === 'granted') return Promise.resolve(true)
  if (Notification.permission === 'denied') return Promise.resolve(false)
  return Notification.requestPermission().then(p => p === 'granted')
}

export function sendNotification(title: string, body: string): void {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  try {
    new Notification(title, { body, icon: '/favicon.ico' })
  } catch {
    // Notification constructor can fail in some environments
  }
}

export function getPermissionStatus(): 'granted' | 'denied' | 'default' | 'unsupported' {
  if (!('Notification' in window)) return 'unsupported'
  return Notification.permission as 'granted' | 'denied' | 'default'
}
