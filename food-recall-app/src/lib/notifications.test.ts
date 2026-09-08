import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { requestNotificationPermission, sendNotification, getPermissionStatus } from './notifications'

const mockNotification = (permission: string) => {
  const mock = vi.fn() as any
  mock.permission = permission
  mock.requestPermission = vi.fn().mockResolvedValue(permission)
  vi.stubGlobal('Notification', mock)
}

const removeNotification = () => {
  vi.unstubAllGlobals()
}

describe('requestNotificationPermission', () => {
  afterEach(() => {
    removeNotification()
  })

  it('returns false when Notification API is not available', async () => {
    removeNotification()
    const result = await requestNotificationPermission()
    expect(result).toBe(false)
  })

  it('returns true when permission already granted', async () => {
    mockNotification('granted')
    const result = await requestNotificationPermission()
    expect(result).toBe(true)
  })

  it('returns false when permission denied', async () => {
    mockNotification('denied')
    const result = await requestNotificationPermission()
    expect(result).toBe(false)
  })

  it('calls requestPermission when default', async () => {
    const mockRequest: any = vi.fn().mockResolvedValue('granted')
    mockRequest.permission = 'default'
    mockRequest.requestPermission = mockRequest
    vi.stubGlobal('Notification', mockRequest)
    const result = await requestNotificationPermission()
    expect(result).toBe(true)
    expect(mockRequest.requestPermission).toHaveBeenCalled()
  })
})

describe('sendNotification', () => {
  afterEach(() => {
    removeNotification()
  })

  it('does nothing when Notification is not granted', () => {
    mockNotification('denied')
    expect(() => sendNotification('title', 'body')).not.toThrow()
  })

  it('creates notification when granted', () => {
    mockNotification('granted')
    sendNotification('Test Title', 'Test Body')
    expect(globalThis.Notification).toHaveBeenCalled()
  })

  it('does nothing when Notification API is unavailable', () => {
    removeNotification()
    expect(() => sendNotification('title', 'body')).not.toThrow()
  })
})

describe('getPermissionStatus', () => {
  afterEach(() => {
    removeNotification()
  })

  it('returns the current permission status', () => {
    mockNotification('granted')
    expect(getPermissionStatus()).toBe('granted')
  })

  it('returns unsupported when Notification API is unavailable', () => {
    removeNotification()
    expect(getPermissionStatus()).toBe('unsupported')
  })
})
