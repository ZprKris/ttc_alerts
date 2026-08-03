const SUBWAY_LINES = Object.freeze({
  1: Object.freeze({ label: 'Line 1', emoji: '🟡', color: '#D5C82B' }),
  2: Object.freeze({ label: 'Line 2', emoji: '🟢', color: '#008000' }),
  4: Object.freeze({ label: 'Line 4', emoji: '🟣', color: '#B300B3' }),
})

const RESTORED_PATTERN =
  /\b(resumed|has resumed|normal service|regular service|reopened|now stopping|cleared)\b/i
const FUTURE_PATTERN =
  /\b(will be|will not|will operate|scheduled|upcoming|starting at|starting \d|begins? (?:at|on))\b/i

function unique(values) {
  return [...new Set(values)]
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function cleanStationName(value) {
  return String(value ?? '')
    .replace(/\s+Station\s*-?\s*$/i, '')
    .replace(/\s+-\s*$/, '')
    .trim()
}

function getImageUrl(value) {
  try {
    const url = new URL(value)
    if (
      url.protocol === 'https:' &&
      /\.(?:avif|gif|jpe?g|png|webp)$/i.test(url.pathname)
    ) {
      return url.href
    }
  } catch {
    // An absent or non-URL value simply means there is no image to embed.
  }
  return null
}

function hasFuturePeriod(activePeriods, now) {
  return (activePeriods ?? []).some((period) => {
    const start = Number(period?.start)
    return Number.isFinite(start) && start > now.getTime()
  })
}

function getStatus(candidate, now) {
  const alertText = [candidate.header_text, candidate.description_text]
    .filter(Boolean)
    .join(' ')

  if (RESTORED_PATTERN.test(alertText)) {
    return {
      kind: 'available',
      symbol: '✅',
      label: 'Service available',
      color: '#16794a',
    }
  }
  if (
    FUTURE_PATTERN.test(alertText) ||
    hasFuturePeriod(candidate.active_periods, now)
  ) {
    return {
      kind: 'future',
      symbol: '⏱️',
      label: 'Upcoming service change',
      color: '#9a6300',
    }
  }
  return {
    kind: 'unavailable',
    symbol: '❌',
    label: 'Service unavailable or disrupted',
    color: '#bd2424',
  }
}

function getLines(routeIds) {
  return unique(routeIds ?? [])
    .map((routeId) => SUBWAY_LINES[String(routeId)])
    .filter(Boolean)
}

export function isTtcSubwayRouteAlert(routeIds) {
  return getLines(routeIds).length > 0
}

export function alertEmail(candidate, { manageUrl, now = new Date() }) {
  const lines = getLines(candidate.route_ids)
  const status = getStatus(candidate, now)
  const stationNames = unique(
    (candidate.matched_station_names ?? candidate.matched_station_ids ?? [])
      .map(cleanStationName)
      .filter(Boolean),
  )
  const displayStations =
    stationNames.length > 0 ? stationNames : ['Monitored station']
  const lineSubject = lines
    .map((line) => `${line.emoji} ${line.label}`)
    .join(' / ')
  const stationSubject = displayStations
    .map((station) => `${station} ${status.symbol}`)
    .join(', ')
  const subject = `${lineSubject || '🚇 TTC Subway'}: ${stationSubject}`
  const alertText =
    candidate.header_text || 'A TTC subway alert affects your stations.'
  const imageUrl = getImageUrl(candidate.alert_url)
  const detailsUrl = imageUrl ? null : candidate.alert_url
  const lineHtml = (
    lines.length > 0 ? lines : [{ label: 'TTC Subway', color: '#303b4f' }]
  )
    .map(
      (line) =>
        `<span style="display:inline-flex;align-items:center;gap:8px"><span aria-hidden="true" style="display:inline-block;width:16px;height:16px;border-radius:50%;background:${line.color};border:1px solid rgba(0,0,0,.18)"></span><span>${escapeHtml(line.label)}</span></span>`,
    )
    .join(' <span aria-hidden="true">/</span> ')
  const stationHtml = displayStations
    .map(
      (station) =>
        `<span style="display:inline-block;margin:3px 5px 3px 0;padding:7px 10px;border:1px solid #d7dce4;border-radius:999px;background:#f7f8fa">${escapeHtml(station)} <span aria-label="${escapeHtml(status.label)}">${status.symbol}</span></span>`,
    )
    .join('')
  const text = [
    subject,
    '',
    `${status.symbol} ${status.label}`,
    '',
    alertText,
    candidate.description_text || '',
    '',
    `Stations: ${displayStations.join(', ')}`,
    imageUrl ? `TTC alert image: ${imageUrl}` : '',
    detailsUrl ? `TTC details: ${detailsUrl}` : '',
    `Manage alerts: ${manageUrl}`,
  ]
    .filter(Boolean)
    .join('\n')
  const html = `<!doctype html><html lang="en"><body style="margin:0;background:#f3f5f7;font-family:Arial,sans-serif;color:#172035;line-height:1.5"><div style="max-width:640px;margin:0 auto;padding:24px 14px"><main style="background:#fff;border:1px solid #dde2e8;border-radius:16px;padding:24px"><h1 style="display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:0 0 18px;font-size:22px;line-height:1.3">${lineHtml}<span aria-hidden="true">:</span><span>${escapeHtml(displayStations.join(', '))} ${status.symbol}</span></h1><div style="margin-bottom:18px">${stationHtml}</div><p style="margin:0 0 16px;color:${status.color};font-weight:700">${status.symbol} ${escapeHtml(status.label)}</p><p style="margin:0 0 12px"><strong>${escapeHtml(alertText)}</strong></p>${candidate.description_text ? `<p style="margin:0 0 16px">${escapeHtml(candidate.description_text)}</p>` : ''}${imageUrl ? `<figure style="margin:20px 0"><img src="${escapeHtml(imageUrl)}" alt="TTC service alert information" width="592" style="display:block;max-width:100%;height:auto;border-radius:10px;border:1px solid #dde2e8"></figure>` : ''}${detailsUrl ? `<p><a href="${escapeHtml(detailsUrl)}">View TTC service details</a></p>` : ''}<p style="margin-top:22px"><a href="${escapeHtml(manageUrl)}">Manage your alerts</a></p><p style="margin:20px 0 0;color:#5d6b7e;font-size:13px">Sent because this alert matched a verified TTC subway monitoring subscription.</p></main></div></body></html>`

  return { subject, text, html }
}
