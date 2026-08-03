import { useMemo } from 'react'
import { ReactFlow } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { sampleNetwork } from '../../data/network.js'
import { getDirectionOptions } from '../selection/directionalNavigation.js'
import DirectionalControls from './DirectionalControls.jsx'
import MapControls from './MapControls.jsx'
import StationNode from './StationNode.jsx'
import TransitEdge from './TransitEdge.jsx'
import { createFlowElements } from './createFlowElements.js'
import { MAP_INTERACTION_OPTIONS } from './mapConfig.js'
import './subwayMap.css'

const nodeTypes = { station: StationNode }
const edgeTypes = { transit: TransitEdge }
// Keep these auxiliary components available in the codebase, but omit them
// from the current map UI.
const SHOW_DIRECTIONAL_CONTROLS = false
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
      aria-label="Interactive TTC subway map"
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        edgeTypes={edgeTypes}
        nodeTypes={nodeTypes}
        nodeOrigin={[0.5, 0.5]}
        fitView
        fitViewOptions={{ padding: 0.08, minZoom: 0.32, maxZoom: 1.1 }}
        minZoom={0.32}
        maxZoom={1.8}
        preventScrolling
        proOptions={{ hideAttribution: true }}
        {...MAP_INTERACTION_OPTIONS}
      >
        <MapControls />
      </ReactFlow>

      {SHOW_DIRECTIONAL_CONTROLS ? (
        <DirectionalControls
          activeStation={activeStation}
          directionOptions={directionOptions}
          pendingDirection={pendingDirection}
          onNavigate={onNavigate}
          onChoose={onChooseDirection}
          onCancel={onCancelDirection}
        />
      ) : null}

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
        Select the stations you want to monitor directly on the map.
      </p>
      <p className="visually-hidden" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>
    </div>
  )
}
