import { useCallback } from 'react'
import AppHeader from './components/AppHeader.jsx'
import MapWorkspace from './components/MapWorkspace.jsx'
import { sampleNetwork, stations } from './data/network.js'
import MonitoringPanelPlaceholder from './features/monitoring/MonitoringPanelPlaceholder.jsx'
import { useDirectionalSelection } from './features/selection/useDirectionalSelection.js'
import { useStationSelection } from './features/selection/useStationSelection.js'

export default function App() {
  const {
    selectedStationIds,
    selectedCount,
    toggleStation,
    selectStation,
    clearSelection,
  } = useStationSelection()
  const {
    activeStationId,
    announcement,
    pendingDirection,
    focusRequest,
    activateStation,
    deactivateStation,
    navigate,
    chooseCandidate,
    cancelPendingDirection,
    resetDirectionalSelection,
  } = useDirectionalSelection({
    network: sampleNetwork,
    onSelectStation: selectStation,
  })
  const selectedStations = stations.filter((station) =>
    selectedStationIds.has(station.id),
  )
  const handleToggleStation = useCallback(
    (stationId, isCurrentlySelected) => {
      toggleStation(stationId)

      if (isCurrentlySelected) {
        deactivateStation(stationId)
      } else {
        activateStation(stationId)
      }
    },
    [activateStation, deactivateStation, toggleStation],
  )
  const handleClearSelection = useCallback(() => {
    clearSelection()
    resetDirectionalSelection()
  }, [clearSelection, resetDirectionalSelection])

  return (
    <div className="app">
      <AppHeader />
      <main className="app-layout">
        <MapWorkspace
          selectedStationIds={selectedStationIds}
          activeStationId={activeStationId}
          announcement={announcement}
          pendingDirection={pendingDirection}
          focusRequest={focusRequest}
          onActivateStation={activateStation}
          onCancelDirection={cancelPendingDirection}
          onChooseDirection={chooseCandidate}
          onNavigate={navigate}
          onToggleStation={handleToggleStation}
        />
        <MonitoringPanelPlaceholder
          selectedStations={selectedStations}
          selectedCount={selectedCount}
          onClearSelection={handleClearSelection}
        />
      </main>
    </div>
  )
}
