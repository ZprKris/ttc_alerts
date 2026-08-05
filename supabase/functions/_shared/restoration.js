export function findMissingActiveAlerts(previousAlerts, currentAlertIds) {
  const currentIds = new Set(currentAlertIds)
  return previousAlerts.filter((alert) => !currentIds.has(alert.alert_id))
}

export function wasActiveRatherThanFuture(alert, now) {
  const periods = alert.active_periods ?? []
  return (
    periods.length === 0 ||
    periods.some((period) => {
      const start = Number(period?.start)
      return !Number.isFinite(start) || start <= now.getTime()
    })
  )
}

export function createRestorationEvent(
  sourceAlert,
  { alertId, contentHash, now, feedTimestamp },
) {
  return {
    alert_id: alertId,
    feed_name: sourceAlert.feed_name,
    content_hash: contentHash,
    header_text: 'Regular service has resumed for the affected stations.',
    description_text: sourceAlert.header_text
      ? `Resolved alert: ${sourceAlert.header_text}`
      : '',
    url: '',
    cause: sourceAlert.cause,
    effect: sourceAlert.effect,
    route_ids: sourceAlert.route_ids,
    stop_ids: sourceAlert.stop_ids,
    affected_station_ids: sourceAlert.affected_station_ids,
    match_kind: sourceAlert.match_kind,
    active_periods: [],
    last_seen_at: now.toISOString(),
    is_active: false,
    feed_timestamp: feedTimestamp,
  }
}
