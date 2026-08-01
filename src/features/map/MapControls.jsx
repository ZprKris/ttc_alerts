import { useReactFlow } from '@xyflow/react'

export default function MapControls() {
  const { fitView, zoomIn, zoomOut } = useReactFlow()

  return (
    <div className="map-controls" aria-label="Map zoom controls">
      <button type="button" onClick={() => zoomIn({ duration: 180 })}>
        <span aria-hidden="true">+</span>
        <span className="visually-hidden">Zoom in</span>
      </button>
      <button type="button" onClick={() => zoomOut({ duration: 180 })}>
        <span aria-hidden="true">−</span>
        <span className="visually-hidden">Zoom out</span>
      </button>
      <button
        className="fit-view-button"
        type="button"
        onClick={() => fitView({ duration: 220, padding: 0.18 })}
      >
        <span aria-hidden="true">⌗</span>
        <span className="visually-hidden">Fit map to view</span>
      </button>
    </div>
  )
}
