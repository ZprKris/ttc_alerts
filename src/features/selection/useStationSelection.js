import { useCallback, useState } from 'react'
import { toggleStationId } from './selectionModel.js'

export function useStationSelection() {
  const [selectedStationIds, setSelectedStationIds] = useState(() => new Set())

  const toggleStation = useCallback((stationId) => {
    setSelectedStationIds((currentSelection) =>
      toggleStationId(currentSelection, stationId),
    )
  }, [])

  const selectStation = useCallback((stationId) => {
    setSelectedStationIds((currentSelection) => {
      if (currentSelection.has(stationId)) {
        return currentSelection
      }

      return new Set(currentSelection).add(stationId)
    })
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedStationIds((currentSelection) =>
      currentSelection.size === 0 ? currentSelection : new Set(),
    )
  }, [])

  return {
    selectedStationIds,
    selectedCount: selectedStationIds.size,
    toggleStation,
    selectStation,
    clearSelection,
  }
}
