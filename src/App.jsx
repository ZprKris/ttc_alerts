import { useCallback, useState } from 'react'
import AppHeader from './components/AppHeader.jsx'
import MapWorkspace from './components/MapWorkspace.jsx'
import { sampleNetwork, stations } from './data/network.js'
import MonitoringPanel from './features/monitoring/MonitoringPanel.jsx'
import { useDirectionalSelection } from './features/selection/useDirectionalSelection.js'
import { useStationSelection } from './features/selection/useStationSelection.js'
import { readPendingPreferenceDraft } from './services/preferenceDraft.js'

export default function App() {
  const [initialDraft] = useState(readPendingPreferenceDraft)
  const initialStationIds = (initialDraft?.stationIds ?? []).filter(
    (stationId) => stations.some((station) => station.id === stationId),
  )
  const {
    selectedStationIds,
    selectedCount,
    toggleStation,
    selectStation,
    clearSelection,
    replaceSelection,
  } = useStationSelection(initialStationIds)
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
  const handleReplaceSelection = useCallback(
    (stationIds) => {
      const knownStationIds = stationIds.filter((stationId) =>
        stations.some((station) => station.id === stationId),
      )
      replaceSelection(knownStationIds)
      resetDirectionalSelection()
    },
    [replaceSelection, resetDirectionalSelection],
  )

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
        <MonitoringPanel
          initialDraft={initialDraft}
          allStations={stations}
          selectedStations={selectedStations}
          selectedCount={selectedCount}
          onClearSelection={handleClearSelection}
          onReplaceSelection={handleReplaceSelection}
        />
      </main>
    </div>
  )
}
