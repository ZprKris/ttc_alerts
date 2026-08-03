export const DIRECTIONS = Object.freeze(['up', 'right', 'down', 'left'])

function getScreenDirection(source, target) {
  const sourcePosition = source.navigationPosition ?? source.position
  const targetPosition = target.navigationPosition ?? target.position
  const horizontalDistance = targetPosition.x - sourcePosition.x
  const verticalDistance = targetPosition.y - sourcePosition.y

  if (Math.abs(horizontalDistance) >= Math.abs(verticalDistance)) {
    return horizontalDistance >= 0 ? 'right' : 'left'
  }

  return verticalDistance >= 0 ? 'down' : 'up'
}

function getAdjacentStationIds(orderedStationIds, stationId) {
  const stationIndex = orderedStationIds.indexOf(stationId)

  if (stationIndex === -1) {
    return []
  }

  return [
    orderedStationIds[stationIndex - 1],
    orderedStationIds[stationIndex + 1],
  ].filter(Boolean)
}

export function getDirectionalCandidates(network, stationId, direction) {
  if (!DIRECTIONS.includes(direction)) {
    throw new Error(`Unsupported direction: ${direction}`)
  }

  const stationsById = new Map(
    network.stations.map((station) => [station.id, station]),
  )
  const sourceStation = stationsById.get(stationId)

  if (!sourceStation) {
    throw new Error(`Unknown station: ${stationId}`)
  }

  const candidates = []

  network.lines.forEach((line) => {
    const routeSegments = [
      {
        branchId: null,
        branchName: null,
        orderedStationIds: line.orderedStationIds,
      },
      ...(line.branches ?? []).map((branch) => ({
        branchId: branch.id,
        branchName: branch.name,
        orderedStationIds: branch.orderedStationIds,
      })),
    ]

    routeSegments.forEach((segment) => {
      getAdjacentStationIds(segment.orderedStationIds, stationId).forEach(
        (candidateStationId) => {
          const station = stationsById.get(candidateStationId)

          if (
            !station ||
            getScreenDirection(sourceStation, station) !== direction
          ) {
            return
          }

          candidates.push({
            stationId: station.id,
            stationName: station.name,
            lineId: line.id,
            lineName: line.name,
            lineShortName: line.shortName,
            lineColor: line.color,
            lineTextColor: line.textColor,
            branchId: segment.branchId,
            branchName: segment.branchName,
            routeLabel: segment.branchName
              ? `${line.name} — ${segment.branchName}`
              : line.name,
          })
        },
      )
    })
  })

  const uniqueCandidates = new Map()
  candidates.forEach((candidate) => {
    const key = `${candidate.stationId}:${candidate.lineId}:${
      candidate.branchId ?? 'main'
    }`
    uniqueCandidates.set(key, candidate)
  })

  return [...uniqueCandidates.values()]
}

export function getDirectionOptions(network, stationId) {
  return Object.fromEntries(
    DIRECTIONS.map((direction) => [
      direction,
      getDirectionalCandidates(network, stationId, direction),
    ]),
  )
}
