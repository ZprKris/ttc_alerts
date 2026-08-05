import { describe, expect, it } from 'vitest'
import {
  createRestorationEvent,
  findMissingActiveAlerts,
  wasActiveRatherThanFuture,
} from '../../../supabase/functions/_shared/restoration.js'

describe('service restoration alerts', () => {
  it('finds an active alert that disappeared from the feed', () => {
    const previous = [{ alert_id: 'still-live' }, { alert_id: 'resolved' }]

    expect(findMissingActiveAlerts(previous, ['still-live'])).toEqual([
      { alert_id: 'resolved' },
    ])
  })

  it('does not treat a future alert as restored before it starts', () => {
    const now = new Date('2026-08-04T12:00:00.000Z')

    expect(
      wasActiveRatherThanFuture(
        { active_periods: [{ start: now.getTime() + 60_000, end: null }] },
        now,
      ),
    ).toBe(false)
  })

  it('preserves matching details in a synthetic restoration event', () => {
    const now = new Date('2026-08-04T12:00:00.000Z')
    const event = createRestorationEvent(
      {
        alert_id: 'original',
        feed_name: 'subway',
        header_text: 'No service at Warden.',
        cause: '2',
        effect: '1',
        route_ids: ['2'],
        stop_ids: ['WARDEN'],
        affected_station_ids: ['warden'],
        match_kind: 'station',
      },
      {
        alertId: 'original:restored:abc',
        contentHash: 'a'.repeat(64),
        now,
        feedTimestamp: now.toISOString(),
      },
    )

    expect(event).toMatchObject({
      alert_id: 'original:restored:abc',
      header_text: 'Regular service has resumed for the affected stations.',
      description_text: 'Resolved alert: No service at Warden.',
      route_ids: ['2'],
      affected_station_ids: ['warden'],
      is_active: false,
    })
  })
})
