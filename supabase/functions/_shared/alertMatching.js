const ISO_WEEKDAY_BY_NAME = Object.freeze({
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
  Sun: 7,
})

const ENDPOINT_PATTERNS = [
  /\bbetween\s+(.+?)\s+(?:and|&)\s+(.+?)(?=[.!?,;]|$)/i,
  /\bfrom\s+(.+?)\s+(?:to|through|until)\s+(.+?)(?=[.!?,;]|$)/i,
]

export function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

export function getTranslatedText(value) {
  const translations = value?.translation ?? []
  return (
    translations.find((translation) => translation.language === 'en')?.text ??
    translations[0]?.text ??
    ''
  )
}

function gtfsTimestampMilliseconds(value) {
  const seconds = Number(value)
  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : null
}

export function extractAlertDetails(entity, now = Date.now()) {
  const alert = entity.alert ?? {}
  const activePeriods = (alert.activePeriod ?? []).map((period) => ({
    start: gtfsTimestampMilliseconds(period.start),
    end: gtfsTimestampMilliseconds(period.end),
  }))
  const isActive =
    activePeriods.length === 0 ||
    activePeriods.some(
      (period) =>
        (period.start === null || now >= period.start) &&
        (period.end === null || now < period.end),
    )
  const isFuture =
    activePeriods.length > 0 &&
    !isActive &&
    activePeriods.some((period) => period.start !== null && now < period.start)
  const informedEntities = alert.informedEntity ?? []
  const routeIds = unique(
    informedEntities
      .flatMap((informedEntity) => [
        informedEntity.routeId,
        informedEntity.trip?.routeId,
      ])
      .filter(Boolean),
  )
  const stopIds = unique(
    informedEntities
      .map((informedEntity) => informedEntity.stopId)
      .filter(Boolean),
  )
  const headerText = getTranslatedText(alert.headerText)
  const descriptionText = getTranslatedText(alert.descriptionText)

  return {
    entityId: String(entity.id ?? ''),
    headerText,
    descriptionText,
    text: [headerText, descriptionText].filter(Boolean).join(' '),
    url: getTranslatedText(alert.url),
    cause: alert.cause == null ? null : String(alert.cause),
    effect: alert.effect == null ? null : String(alert.effect),
    routeIds,
    stopIds,
    activePeriods,
    isActive,
    isFuture,
  }
}

export function createNetworkCatalog({
  stations = [],
  lines = [],
  lineStations = [],
}) {
  const stationById = new Map(stations.map((station) => [station.id, station]))
  const stationByStopId = new Map(
    stations.flatMap((station) =>
      (station.officialStopIds ?? [station.officialStopId])
        .filter(Boolean)
        .map((officialStopId) => [officialStopId, station]),
    ),
  )
  const stationNameEntries = stations
    .filter((station) => station.name)
    .map((station) => ({
      station,
      normalizedName: normalizeText(station.name),
    }))
    .sort(
      (first, second) =>
        second.normalizedName.length - first.normalizedName.length,
    )
  const lineById = new Map(lines.map((line) => [line.id, line]))
  const routeToLineIds = new Map()
  lines.forEach((line) => {
    if (!line.officialRouteId) {
      return
    }
    const existing = routeToLineIds.get(line.officialRouteId) ?? []
    existing.push(line.id)
    routeToLineIds.set(line.officialRouteId, existing)
  })
  const stationIdsByLineId = new Map()
  lineStations.forEach((lineStation) => {
    const current = stationIdsByLineId.get(lineStation.lineId) ?? []
    current.push(lineStation)
    stationIdsByLineId.set(lineStation.lineId, current)
  })
  stationIdsByLineId.forEach((entries, lineId) => {
    stationIdsByLineId.set(
      lineId,
      entries
        .sort((first, second) => first.sequence - second.sequence)
        .map((entry) => entry.stationId),
    )
  })

  return {
    stationById,
    stationByStopId,
    stationNameEntries,
    lineById,
    routeToLineIds,
    stationIdsByLineId,
  }
}

function findStationInPhrase(phrase, catalog) {
  const normalizedPhrase = normalizeText(phrase)
  return (
    catalog.stationNameEntries.find(({ normalizedName }) =>
      normalizedPhrase.includes(normalizedName),
    )?.station ?? null
  )
}

function findEndpointPair(text, catalog) {
  for (const pattern of ENDPOINT_PATTERNS) {
    const match = pattern.exec(text)
    if (!match) {
      continue
    }
    const firstStation = findStationInPhrase(match[1], catalog)
    const secondStation = findStationInPhrase(match[2], catalog)
    if (firstStation && secondStation && firstStation.id !== secondStation.id) {
      return [firstStation.id, secondStation.id]
    }
  }
  return null
}

function expandRange(firstStationId, secondStationId, lineIds, catalog) {
  for (const lineId of lineIds) {
    const orderedStationIds = catalog.stationIdsByLineId.get(lineId) ?? []
    const firstIndex = orderedStationIds.indexOf(firstStationId)
    const secondIndex = orderedStationIds.indexOf(secondStationId)
    if (firstIndex === -1 || secondIndex === -1) {
      continue
    }
    const start = Math.min(firstIndex, secondIndex)
    const end = Math.max(firstIndex, secondIndex)
    return orderedStationIds.slice(start, end + 1)
  }
  return []
}

export function expandAffectedStations(details, catalog) {
  const lineIds = unique(
    details.routeIds.flatMap(
      (routeId) => catalog.routeToLineIds.get(routeId) ?? [],
    ),
  )
  const directStationIds = unique(
    details.stopIds
      .map((stopId) => catalog.stationByStopId.get(stopId)?.id)
      .filter(Boolean),
  )
  const endpointPair = findEndpointPair(details.text, catalog)
  const rangeStationIds = endpointPair
    ? expandRange(endpointPair[0], endpointPair[1], lineIds, catalog)
    : []
  const lineStationIds = lineIds.flatMap(
    (lineId) => catalog.stationIdsByLineId.get(lineId) ?? [],
  )
  const affectedStationIds = unique(
    rangeStationIds.length > 0
      ? rangeStationIds
      : directStationIds.length > 0
        ? directStationIds
        : lineStationIds,
  )

  return {
    affectedStationIds,
    lineIds,
    matchKind:
      rangeStationIds.length > 0 || directStationIds.length > 0
        ? 'station'
        : lineStationIds.length > 0
          ? 'line'
          : 'unknown',
    endpointPair,
  }
}

function parseTime(value) {
  const match = /^(\d{2}):(\d{2})/.exec(String(value ?? ''))
  if (!match) {
    return null
  }
  return Number(match[1]) * 60 + Number(match[2])
}

function getLocalDateParts(now, timeZone) {
  try {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat('en-CA', {
        timeZone,
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      })
        .formatToParts(now)
        .filter((part) => part.type !== 'literal')
        .map((part) => [part.type, part.value]),
    )
    return {
      isoWeekday: ISO_WEEKDAY_BY_NAME[parts.weekday],
      minutes: Number(parts.hour) * 60 + Number(parts.minute),
    }
  } catch {
    return null
  }
}

export function matchesMonitoringWindow(preference, now = new Date()) {
  const start = parseTime(preference.startTime)
  const end = parseTime(preference.endTime)
  const localParts = getLocalDateParts(now, preference.timeZone)
  const weekdays = new Set(preference.isoWeekdays ?? [])
  if (
    start === null ||
    end === null ||
    start === end ||
    !localParts?.isoWeekday ||
    weekdays.size === 0
  ) {
    return false
  }

  if (end > start) {
    return (
      weekdays.has(localParts.isoWeekday) &&
      localParts.minutes >= start &&
      localParts.minutes < end
    )
  }

  const previousIsoWeekday =
    localParts.isoWeekday === 1 ? 7 : localParts.isoWeekday - 1
  return (
    (weekdays.has(localParts.isoWeekday) && localParts.minutes >= start) ||
    (weekdays.has(previousIsoWeekday) && localParts.minutes < end)
  )
}

export function unique(values) {
  return [...new Set(values)]
}
