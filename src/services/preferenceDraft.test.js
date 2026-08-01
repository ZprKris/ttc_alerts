import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearPendingPreferenceDraft,
  readPendingPreferenceDraft,
  savePendingPreferenceDraft,
} from './preferenceDraft.js'

describe('pending preference draft', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
  })

  it('retains only non-personal fields needed after a magic link', () => {
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

    const storedValue = window.sessionStorage.getItem(
      'ttc-alerts:pending-preference:v1',
    )

    expect(JSON.parse(storedValue)).toEqual({
      startTime: '22:00',
      endTime: '02:00',
      timeZone: 'America/Toronto',
      weekdays: ['monday', 'friday'],
      stationIds: ['northgate'],
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

    window.sessionStorage.setItem(
      'ttc-alerts:pending-preference:v1',
      '{not-json',
    )
    expect(readPendingPreferenceDraft()).toBeNull()
    expect(window.sessionStorage).toHaveLength(0)
  })
})
