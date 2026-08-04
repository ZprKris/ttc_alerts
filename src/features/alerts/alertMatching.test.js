import { describe, expect, it } from 'vitest'
import {
  createNetworkCatalog,
  expandAffectedStations,
  extractAlertDetails,
  matchesMonitoringWindow,
} from '../../../supabase/functions/_shared/alertMatching.js'

const catalog = createNetworkCatalog({
  stations: [
    { id: 'finch', name: 'Finch', officialStopId: 'stop-finch' },
    { id: 'yonge', name: 'Yonge', officialStopId: 'stop-yonge' },
    { id: 'eglinton', name: 'Eglinton', officialStopId: 'stop-eglinton' },
    { id: 'st-clair', name: 'St Clair', officialStopId: 'stop-st-clair' },
  ],
  lines: [{ id: 'line-1', officialRouteId: '1', name: 'Line 1' }],
  lineStations: [
    { lineId: 'line-1', stationId: 'finch', sequence: 1 },
    { lineId: 'line-1', stationId: 'yonge', sequence: 2 },
    { lineId: 'line-1', stationId: 'eglinton', sequence: 3 },
    { lineId: 'line-1', stationId: 'st-clair', sequence: 4 },
  ],
})

describe('TTC alert matching', () => {
  it('expands a route alert between named endpoints inclusively', () => {
    const details = extractAlertDetails({
      id: 'alert-1',
      alert: {
        informedEntity: [{ routeId: '1' }],
        headerText: {
          translation: [
            {
              language: 'en',
              text: 'No subway service between Finch and Eglinton',
            },
          ],
        },
      },
    })

    expect(expandAffectedStations(details, catalog)).toMatchObject({
      affectedStationIds: ['finch', 'yonge', 'eglinton'],
      lineIds: ['line-1'],
      matchKind: 'station',
      endpointPair: ['finch', 'eglinton'],
    })
  })

  it('uses all stations on a known line when no stop is identified', () => {
    const details = extractAlertDetails({
      id: 'alert-2',
      alert: {
        informedEntity: [{ routeId: '1' }],
        headerText: { translation: [{ text: 'Line 1 delays' }] },
      },
    })

    expect(expandAffectedStations(details, catalog)).toMatchObject({
      affectedStationIds: ['finch', 'yonge', 'eglinton', 'st-clair'],
      matchKind: 'line',
    })
  })

  it('prefers a directly identified stop over a line-wide fallback', () => {
    const details = extractAlertDetails({
      id: 'alert-3',
      alert: {
        informedEntity: [{ routeId: '1', stopId: 'stop-yonge' }],
        headerText: { translation: [{ text: 'Elevator alert at Yonge' }] },
      },
    })

    expect(expandAffectedStations(details, catalog).affectedStationIds).toEqual(
      ['yonge'],
    )
  })

  it('does not identify an LRT route as a known subway line at a shared station', () => {
    const details = extractAlertDetails({
      id: 'alert-lrt',
      alert: {
        informedEntity: [{ routeId: '6', stopId: 'stop-finch' }],
        headerText: {
          translation: [{ text: 'No LRT service at Finch West' }],
        },
      },
    })

    expect(expandAffectedStations(details, catalog)).toMatchObject({
      lineIds: [],
      affectedStationIds: ['finch'],
    })
  })

  it('recognizes an alert whose active period starts in the future', () => {
    const details = extractAlertDetails(
      {
        id: 'alert-future',
        alert: {
          informedEntity: [{ routeId: '1' }],
          activePeriod: [{ start: 1785762000, end: 1785769200 }],
        },
      },
      new Date('2026-08-03T04:00:00.000Z').getTime(),
    )

    expect(details).toMatchObject({ isActive: false, isFuture: true })
  })

  it('treats a protobuf zero timestamp as an open active-period boundary', () => {
    const zeroTimestamp = { valueOf: () => 0 }
    const details = extractAlertDetails(
      {
        id: 'alert-open-ended',
        alert: {
          informedEntity: [{ routeId: '1' }],
          activePeriod: [
            {
              start: { valueOf: () => 1785793200 },
              end: zeroTimestamp,
            },
          ],
        },
      },
      new Date('2026-08-03T21:42:00.000Z').getTime(),
    )

    expect(details.activePeriods).toEqual([{ start: 1785793200000, end: null }])
    expect(details).toMatchObject({ isActive: true, isFuture: false })
  })

  it('handles same-day and overnight monitoring windows in the configured zone', () => {
    expect(
      matchesMonitoringWindow(
        {
          startTime: '08:00',
          endTime: '10:00',
          timeZone: 'America/Toronto',
          isoWeekdays: [1],
        },
        new Date('2026-08-03T13:30:00.000Z'),
      ),
    ).toBe(true)

    expect(
      matchesMonitoringWindow(
        {
          startTime: '22:00',
          endTime: '02:00',
          timeZone: 'America/Toronto',
          isoWeekdays: [1],
        },
        new Date('2026-08-04T05:30:00.000Z'),
      ),
    ).toBe(true)
  })
})
