import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearPendingPreferenceDraft,
  readPendingPreferenceDraft,
  savePendingPreferenceDraft,
} from './preferenceDraft.js'

describe('pending preference draft', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.sessionStorage.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('retains only non-personal fields needed after a magic link', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-03T12:00:00.000Z'))

    savePendingPreferenceDraft(
      {
        startTime: '22:00',
        endTime: '02:00',
        timeZone: 'America/Toronto',
        weekdays: ['monday', 'friday'],
        email: 'rider@example.com',
        consent: true,
      },
      ['northgate'],
    )

    const storedValue = window.localStorage.getItem(
      'ttc-alerts:pending-preference:v2',
    )

    expect(JSON.parse(storedValue)).toEqual({
      startTime: '22:00',
      endTime: '02:00',
      timeZone: 'America/Toronto',
      weekdays: ['monday', 'friday'],
      stationIds: ['northgate'],
      expiresAt: new Date('2026-08-03T13:00:00.000Z').getTime(),
    })
    expect(storedValue).not.toContain('rider@example.com')
    expect(storedValue).not.toContain('consent')
  })

  it('reads, clears, and rejects malformed drafts', () => {
    savePendingPreferenceDraft(
      {
        startTime: '07:00',
        endTime: '09:00',
        timeZone: 'America/Toronto',
        weekdays: ['monday'],
      },
      ['central'],
    )

    expect(readPendingPreferenceDraft()).toMatchObject({
      stationIds: ['central'],
    })

    clearPendingPreferenceDraft()
    expect(readPendingPreferenceDraft()).toBeNull()

    window.localStorage.setItem('ttc-alerts:pending-preference:v2', '{not-json')
    expect(readPendingPreferenceDraft()).toBeNull()
    expect(window.localStorage).toHaveLength(0)
  })

  it('expires a cross-tab draft after one hour', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-03T12:00:00.000Z'))
    savePendingPreferenceDraft(
      {
        startTime: '07:00',
        endTime: '09:00',
        timeZone: 'America/Toronto',
        weekdays: ['monday'],
      },
      ['central'],
    )

    vi.setSystemTime(new Date('2026-08-03T13:00:01.000Z'))

    expect(readPendingPreferenceDraft()).toBeNull()
    expect(window.localStorage).toHaveLength(0)
  })
})
