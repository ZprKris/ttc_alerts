import SubwayMap from '../features/map/SubwayMap.jsx'

export default function MapWorkspace({
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
  return (
    <section className="map-card" id="main-map" aria-labelledby="map-heading">
      <div className="map-toolbar">
        <div>
          <p className="eyebrow">Subway network</p>
          <h1 id="map-heading">Choose the stations you care about</h1>
        </div>
        <span className="map-status">
          <span aria-hidden="true" /> Sample network
        </span>
      </div>

      <SubwayMap
        selectedStationIds={selectedStationIds}
        activeStationId={activeStationId}
        announcement={announcement}
        pendingDirection={pendingDirection}
        focusRequest={focusRequest}
        onActivateStation={onActivateStation}
        onCancelDirection={onCancelDirection}
        onChooseDirection={onChooseDirection}
        onNavigate={onNavigate}
        onToggleStation={onToggleStation}
      />
    </section>
  )
}
