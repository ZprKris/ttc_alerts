const LINE_TWO_Y = 820

const lineTwoX = [
  90, 155, 220, 285, 350, 415, 480, 545, 610, 675, 740, 805, 870, 935, 1000,
  1100, 1260, 1420, 1485, 1550, 1615, 1680, 1745, 1810, 1875, 1940, 2005, 2070,
  2135, 2200, 2265,
]

const lineOnePositions = {
  finch: [1420, 80],
  'north-york-centre': [1420, 180],
  'sheppard-yonge': [1420, 280],
  'york-mills': [1420, 350],
  lawrence: [1420, 420],
  eglinton: [1420, 490],
  davisville: [1420, 560],
  'st-clair': [1420, 630],
  summerhill: [1420, 700],
  rosedale: [1420, 760],
  wellesley: [1420, 890],
  college: [1420, 960],
  tmu: [1420, 1030],
  queen: [1420, 1100],
  king: [1420, 1170],
  union: [1260, 1330],
  'st-andrew': [1100, 1170],
  osgoode: [1100, 1100],
  'st-patrick': [1100, 1030],
  'queen-s-park': [1100, 960],
  museum: [1100, 890],
  'st-george': [1100, LINE_TWO_Y],
  spadina: [1000, LINE_TWO_Y],
  dupont: [1000, 768],
  'st-clair-west': [1000, 716],
  cedarvale: [1000, 664],
  glencairn: [1000, 612],
  'lawrence-west': [1000, 560],
  yorkdale: [1000, 508],
  wilson: [1000, 456],
  'sheppard-west': [1000, 404],
  'downsview-park': [1000, 352],
  'finch-west': [1000, 300],
  'york-university': [1000, 248],
  'pioneer-village': [1000, 196],
  'highway-407': [1000, 144],
  'vaughan-metropolitan-centre-station': [1000, 92],
}

const lineFourPositions = {
  'sheppard-yonge': [1420, 280],
  bayview: [1560, 280],
  bessarion: [1700, 280],
  leslie: [1840, 280],
  'don-mills-station': [1980, 280],
}

const specialPlacements = {
  union: 'bottom',
  king: 'right',
  'st-andrew': 'left',
  spadina: 'top-wide',
  'st-george': 'top-wide',
  yonge: 'bottom-wide',
  'sheppard-yonge': 'left',
  'vaughan-metropolitan-centre-station': 'left-wide',
  bayview: 'top',
  bessarion: 'bottom',
  leslie: 'top',
  'don-mills-station': 'bottom',
}

function getLineTwoPlacement(index) {
  return index % 2 === 0 ? 'top' : 'bottom'
}

export function createSchematicStations(stations, lines) {
  const lineTwo = lines.find((line) => line.id === 'line-2')
  const positions = new Map(
    Object.entries(lineOnePositions).map(([id, [x, y]]) => [id, { x, y }]),
  )

  lineTwo.orderedStationIds.forEach((id, index) => {
    positions.set(id, { x: lineTwoX[index], y: LINE_TWO_Y })
  })
  Object.entries(lineFourPositions).forEach(([id, [x, y]]) => {
    positions.set(id, { x, y })
  })

  return stations.map((station) => {
    const lineTwoIndex = lineTwo.orderedStationIds.indexOf(station.id)
    let labelPlacement =
      lineTwoIndex >= 0
        ? getLineTwoPlacement(lineTwoIndex)
        : station.position.x < 1200
          ? 'left'
          : 'right'

    labelPlacement = specialPlacements[station.id] ?? labelPlacement

    return {
      ...station,
      navigationPosition: station.navigationPosition ?? station.position,
      position: positions.get(station.id) ?? station.position,
      labelPlacement,
    }
  })
}
