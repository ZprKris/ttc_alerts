import { describe, expect, it } from 'vitest'
import {
  createInitialMonitoringValues,
  getScheduleKind,
  isoWeekdaysToValues,
  validateMonitoringValues,
  weekdayValuesToIso,
} from './monitoringForm.js'

describe('monitoring preference rules', () => {
  it('reports missing stations, days, email, and consent', () => {
    const values = {
      ...createInitialMonitoringValues(),
      weekdays: [],
      email: 'not-an-email',
      consent: false,
    }

    expect(validateMonitoringValues(values, 0)).toMatchObject({
      selectedStations: 'Select at least one station to monitor.',
      weekdays: 'Choose at least one monitoring day.',
      email: 'Enter a valid email address.',
      consent: 'Consent is required before monitoring emails can be sent.',
    })
  })

  it('rejects equal start and end times instead of assuming 24 hours', () => {
    const values = {
      ...createInitialMonitoringValues(),
      startTime: '08:00',
      endTime: '08:00',
      email: 'rider@example.com',
      consent: true,
    }

    expect(validateMonitoringValues(values, 1).endTime).toBe(
      'Start and end times must be different.',
    )
    expect(getScheduleKind(values.startTime, values.endTime)).toBe('invalid')
  })

  it('accepts an earlier end time as an overnight schedule', () => {
    const values = {
      ...createInitialMonitoringValues(),
      startTime: '22:00',
      endTime: '02:00',
      email: 'rider@example.com',
      consent: true,
    }

    expect(validateMonitoringValues(values, 1)).toEqual({})
    expect(getScheduleKind(values.startTime, values.endTime)).toBe('overnight')
  })

  it('recognizes a same-day monitoring window', () => {
    expect(getScheduleKind('07:30', '10:15')).toBe('same-day')
  })

  it('converts browser weekday values to ISO weekdays and back', () => {
    const values = ['monday', 'friday', 'sunday']

    expect(weekdayValuesToIso(values)).toEqual([1, 5, 7])
    expect(isoWeekdaysToValues([1, 5, 7])).toEqual(values)
  })
})
