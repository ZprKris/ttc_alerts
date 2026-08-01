function getConnectionHandles(source, target) {
  const horizontalDistance = target.position.x - source.position.x
  const verticalDistance = target.position.y - source.position.y

  if (Math.abs(horizontalDistance) >= Math.abs(verticalDistance)) {
    return horizontalDistance >= 0
      ? { sourceHandle: 'source-right', targetHandle: 'target-left' }
      : { sourceHandle: 'source-left', targetHandle: 'target-right' }
  }

  return verticalDistance >= 0
    ? { sourceHandle: 'source-bottom', targetHandle: 'target-top' }
    : { sourceHandle: 'source-top', targetHandle: 'target-bottom' }
}

export function createFlowElements(network) {
  const stationsById = new Map(
    network.stations.map((station) => [station.id, station]),
  )
  const linesById = new Map(network.lines.map((line) => [line.id, line]))

  const nodes = network.stations.map((station) => ({
    id: station.id,
    type: 'station',
    position: station.position,
    data: {
      name: station.name,
      lineIds: station.lineIds,
      labelPlacement: station.labelPlacement,
      isInterchange: Boolean(station.interchange),
    },
    ariaLabel: `${station.name} station${
      station.interchange ? ', interchange' : ''
    }`,
    initialWidth: station.interchange ? 38 : 28,
    initialHeight: station.interchange ? 38 : 28,
    draggable: false,
    selectable: false,
    connectable: false,
    focusable: false,
    style: { pointerEvents: 'all' },
    zIndex: 10,
  }))

  const edges = network.connections.map((connection) => {
    const sourceStation = stationsById.get(connection.source)
    const targetStation = stationsById.get(connection.target)
    const line = linesById.get(connection.lineId)

    if (!sourceStation || !targetStation || !line) {
      throw new Error(`Invalid network connection: ${connection.id}`)
    }

    return {
      id: connection.id,
      source: connection.source,
      target: connection.target,
      ...getConnectionHandles(sourceStation, targetStation),
      type: 'straight',
      style: {
        stroke: line.color,
        strokeWidth: 14,
      },
      data: { lineId: line.id },
      selectable: false,
      focusable: false,
      reconnectable: false,
      zIndex: 0,
    }
  })

  return { nodes, edges }
}
