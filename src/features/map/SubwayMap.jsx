import { useMemo } from 'react'
import { ReactFlow } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { sampleNetwork } from '../../data/network.js'
import { getDirectionOptions } from '../selection/directionalNavigation.js'
import DirectionalControls from './DirectionalControls.jsx'
import MapControls from './MapControls.jsx'
import StationNode from './StationNode.jsx'
import { createFlowElements } from './createFlowElements.js'
import { MAP_INTERACTION_OPTIONS } from './mapConfig.js'
import './subwayMap.css'

const nodeTypes = { station: StationNode }
const { nodes: baseNodes, edges } = createFlowElements(sampleNetwork)

export default function SubwayMap({
  selectedStationIds,
  activeStationId,
  announcement,
  pendingDirection,
  focusRequest,
  onActivateStation,
  onCancelDirection,
  onChooseDirection,
  onNavigate,
  onToggleStation,
}) {
  const activeStation = useMemo(
    () =>
      sampleNetwork.stations.find(
        (station) => station.id === activeStationId,
      ) ?? null,
    [activeStationId],
  )
  const directionOptions = useMemo(
    () =>
      activeStationId
        ? getDirectionOptions(sampleNetwork, activeStationId)
        : null,
    [activeStationId],
  )
  const nodes = useMemo(
    () =>
      baseNodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          isSelected: selectedStationIds.has(node.id),
          isActive: activeStationId === node.id,
          focusRequestId:
            focusRequest.stationId === node.id ? focusRequest.requestId : 0,
          onActivate: onActivateStation,
          onDirection: onNavigate,
          onToggle: onToggleStation,
        },
      })),
    [
      activeStationId,
      focusRequest,
      onActivateStation,
      onNavigate,
      onToggleStation,
      selectedStationIds,
    ],
  )

  return (
    <div
      className="subway-map"
      role="region"
      aria-label="Interactive sample subway map"
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        nodeOrigin={[0.5, 0.5]}
        fitView
        fitViewOptions={{ padding: 0.18, minZoom: 0.65, maxZoom: 1.35 }}
        minZoom={0.55}
        maxZoom={1.8}
        preventScrolling
        proOptions={{ hideAttribution: true }}
        {...MAP_INTERACTION_OPTIONS}
      >
        <MapControls />
      </ReactFlow>

      <DirectionalControls
        activeStation={activeStation}
        directionOptions={directionOptions}
        pendingDirection={pendingDirection}
        onNavigate={onNavigate}
        onChoose={onChooseDirection}
        onCancel={onCancelDirection}
      />

      <div className="map-legend" aria-label="Sample subway lines">
        {sampleNetwork.lines.map((line) => (
          <span key={line.id}>
            <span
              className="legend-swatch"
              style={{ '--line-color': line.color }}
              aria-hidden="true"
            />
            {line.name}
          </span>
        ))}
      </div>

      <p className="map-instructions">
        Select a station, then use arrow keys or the direction pad to continue.
      </p>
      <p className="visually-hidden" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>
    </div>
  )
}
