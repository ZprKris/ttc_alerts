import { describe, expect, it } from 'vitest'
import {
  alertEmail,
  isTtcSubwayRouteAlert,
} from '../../../supabase/functions/_shared/notificationEmail.js'

const manageUrl = 'https://example.com/manage'
const now = new Date('2026-08-03T12:00:00.000Z')

describe('TTC alert notification email', () => {
  it('uses the subway line colour, station name, and unavailable status', () => {
    const email = alertEmail(
      {
        route_ids: ['1'],
        matched_station_names: ['Finch West'],
        header_text: 'Trains are not stopping at Finch West.',
      },
      { manageUrl, now },
    )

    expect(email.subject).toBe('🟡 Line 1: Finch West ❌')
    expect(email.html).toContain('🟡&nbsp;Line&nbsp;1:')
    expect(email.html).toContain('white-space:nowrap')
    expect(email.html).toContain('role="presentation"')
    expect(email.html).not.toContain('display:flex')
    expect(email.html).toContain('Service unavailable or disrupted')
    expect(email.text).toContain('Stations: Finch West')
  })

  it('marks future service changes and embeds a TTC image', () => {
    const imageUrl =
      'https://files.ttc.ca/public-images/planned-line-1-closure.png'
    const email = alertEmail(
      {
        route_ids: ['1'],
        matched_station_names: ['Lawrence West', 'St George'],
        header_text: 'There will be no subway service starting Tuesday.',
        alert_url: imageUrl,
      },
      { manageUrl, now },
    )

    expect(email.subject).toBe('🟡 Line 1: Lawrence West ⏱️, St George ⏱️')
    expect(email.html).toContain(`<img src="${imageUrl}"`)
    expect(email.text).toContain(`TTC alert image: ${imageUrl}`)
    expect(email.html).not.toContain('View TTC service details')
  })

  it('uses a green check when service has resumed', () => {
    const email = alertEmail(
      {
        route_ids: ['2'],
        matched_station_names: ['Pape'],
        header_text: 'Normal service has resumed at Pape.',
      },
      { manageUrl, now },
    )

    expect(email.subject).toBe('🟢 Line 2: Pape ✅')
    expect(email.html).toContain('Service available')
  })

  it('recognizes only TTC subway routes', () => {
    expect(isTtcSubwayRouteAlert(['1'])).toBe(true)
    expect(isTtcSubwayRouteAlert(['2'])).toBe(true)
    expect(isTtcSubwayRouteAlert(['4'])).toBe(true)
    expect(isTtcSubwayRouteAlert(['6'])).toBe(false)
    expect(isTtcSubwayRouteAlert([])).toBe(false)
  })
})
