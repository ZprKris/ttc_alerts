export function toggleStationId(selectedStationIds, stationId) {
  const nextSelection = new Set(selectedStationIds)

  if (nextSelection.has(stationId)) {
    nextSelection.delete(stationId)
  } else {
    nextSelection.add(stationId)
  }

  return nextSelection
}
