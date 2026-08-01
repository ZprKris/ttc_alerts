export const networkMetadata = Object.freeze({
  id: 'ttc-subway-prototype',
  name: 'TTC Subway sample network',
  coordinateSystem: 'schematic',
  isPrototype: true,
  source:
    'Placeholder station data; official TTC GTFS identifiers are deferred to Phase 9',
})

export const lines = [
  {
    id: 'line-amber',
    shortName: 'A',
    name: 'Amber line',
    color: '#f3c613',
    textColor: '#172035',
    orderedStationIds: ['northgate', 'cedar', 'central', 'harbour'],
    branches: [],
  },
  {
    id: 'line-green',
    shortName: 'G',
    name: 'Green line',
    color: '#168447',
    textColor: '#ffffff',
    orderedStationIds: ['west-park', 'central', 'market', 'riverside'],
    branches: [
      {
        id: 'green-hill-branch',
        name: 'Hill branch',
        fromStationId: 'market',
        orderedStationIds: ['market', 'hillcrest'],
      },
    ],
  },
]

export const stations = [
  {
    id: 'northgate',
    name: 'Northgate',
    lineIds: ['line-amber'],
    position: { x: 430, y: 80 },
    labelPlacement: 'right',
  },
  {
    id: 'cedar',
    name: 'Cedar',
    lineIds: ['line-amber'],
    position: { x: 430, y: 220 },
    labelPlacement: 'right',
  },
  {
    id: 'central',
    name: 'Central',
    lineIds: ['line-amber', 'line-green'],
    position: { x: 430, y: 360 },
    labelPlacement: 'top-right',
    interchange: {
      lineIds: ['line-amber', 'line-green'],
    },
  },
  {
    id: 'harbour',
    name: 'Harbour',
    lineIds: ['line-amber'],
    position: { x: 430, y: 500 },
    labelPlacement: 'right',
  },
  {
    id: 'west-park',
    name: 'West Park',
    lineIds: ['line-green'],
    position: { x: 120, y: 360 },
    labelPlacement: 'top',
  },
  {
    id: 'market',
    name: 'Market',
    lineIds: ['line-green'],
    position: { x: 650, y: 360 },
    labelPlacement: 'top',
  },
  {
    id: 'riverside',
    name: 'Riverside',
    lineIds: ['line-green'],
    position: { x: 840, y: 360 },
    labelPlacement: 'top',
  },
  {
    id: 'hillcrest',
    name: 'Hillcrest',
    lineIds: ['line-green'],
    position: { x: 820, y: 250 },
    labelPlacement: 'right',
    branchIds: ['green-hill-branch'],
  },
]

export const connections = [
  {
    id: 'amber-northgate-cedar',
    lineId: 'line-amber',
    source: 'northgate',
    target: 'cedar',
  },
  {
    id: 'amber-cedar-central',
    lineId: 'line-amber',
    source: 'cedar',
    target: 'central',
  },
  {
    id: 'amber-central-harbour',
    lineId: 'line-amber',
    source: 'central',
    target: 'harbour',
  },
  {
    id: 'green-west-central',
    lineId: 'line-green',
    source: 'west-park',
    target: 'central',
  },
  {
    id: 'green-central-market',
    lineId: 'line-green',
    source: 'central',
    target: 'market',
  },
  {
    id: 'green-market-riverside',
    lineId: 'line-green',
    source: 'market',
    target: 'riverside',
  },
  {
    id: 'green-market-hillcrest',
    lineId: 'line-green',
    branchId: 'green-hill-branch',
    source: 'market',
    target: 'hillcrest',
  },
]

export const sampleNetwork = Object.freeze({
  metadata: networkMetadata,
  lines,
  stations,
  connections,
})
