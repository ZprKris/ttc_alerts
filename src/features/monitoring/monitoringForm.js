export const WEEKDAYS = Object.freeze([
  { value: 'monday', shortLabel: 'Mon', label: 'Monday' },
  { value: 'tuesday', shortLabel: 'Tue', label: 'Tuesday' },
  { value: 'wednesday', shortLabel: 'Wed', label: 'Wednesday' },
  { value: 'thursday', shortLabel: 'Thu', label: 'Thursday' },
  { value: 'friday', shortLabel: 'Fri', label: 'Friday' },
  { value: 'saturday', shortLabel: 'Sat', label: 'Saturday' },
  { value: 'sunday', shortLabel: 'Sun', label: 'Sunday' },
])

const weekdayDefaults = WEEKDAYS.slice(0, 5).map((day) => day.value)
const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const weekdayIsoValues = Object.freeze(
  Object.fromEntries(
    WEEKDAYS.map((weekday, index) => [weekday.value, index + 1]),
  ),
)

export function getDefaultTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Toronto'
}

export function getTimeZoneOptions() {
  const detectedTimeZone = getDefaultTimeZone()
  const supportedTimeZones = Intl.supportedValuesOf
    ? Intl.supportedValuesOf('timeZone')
    : [
        'America/Toronto',
        'America/Vancouver',
        'America/Edmonton',
        'America/Winnipeg',
        'America/Halifax',
        'America/St_Johns',
        'UTC',
      ]

  return [
    detectedTimeZone,
    ...new Set(['America/Toronto', 'UTC', ...supportedTimeZones]),
  ].filter(
    (timeZone, index, timeZones) => timeZones.indexOf(timeZone) === index,
  )
}

export function createInitialMonitoringValues() {
  return {
    startTime: '07:00',
    endTime: '09:00',
    timeZone: getDefaultTimeZone(),
    weekdays: weekdayDefaults,
    email: '',
    consent: false,
  }
}

export function getScheduleKind(startTime, endTime) {
  if (!timePattern.test(startTime) || !timePattern.test(endTime)) {
    return 'invalid'
  }

  if (startTime === endTime) {
    return 'invalid'
  }

  return endTime < startTime ? 'overnight' : 'same-day'
}

export function weekdayValuesToIso(weekdays) {
  return weekdays.map((weekday) => weekdayIsoValues[weekday]).filter(Boolean)
}

export function isoWeekdaysToValues(isoWeekdays) {
  return isoWeekdays
    .map((isoWeekday) => WEEKDAYS[isoWeekday - 1]?.value)
    .filter(Boolean)
}

export function validateEmailAddress(email) {
  return emailPattern.test(email.trim()) ? null : 'Enter a valid email address.'
}

function isSupportedTimeZone(timeZone) {
  try {
    new Intl.DateTimeFormat('en', { timeZone }).format()
    return true
  } catch {
    return false
  }
}

export function validateMonitoringValues(values, selectedStationCount) {
  const errors = {}

  if (selectedStationCount === 0) {
    errors.selectedStations = 'Select at least one station to monitor.'
  }

  if (!timePattern.test(values.startTime)) {
    errors.startTime = 'Choose a valid start time.'
  }

  if (!timePattern.test(values.endTime)) {
    errors.endTime = 'Choose a valid end time.'
  } else if (
    timePattern.test(values.startTime) &&
    values.startTime === values.endTime
  ) {
    errors.endTime = 'Start and end times must be different.'
  }

  if (!values.timeZone || !isSupportedTimeZone(values.timeZone)) {
    errors.timeZone = 'Choose a supported time zone.'
  }

  if (!values.weekdays.length) {
    errors.weekdays = 'Choose at least one monitoring day.'
  }

  const emailError = validateEmailAddress(values.email)
  if (emailError) {
    errors.email = emailError
  }

  if (!values.consent) {
    errors.consent = 'Consent is required before monitoring emails can be sent.'
  }

  return errors
}
