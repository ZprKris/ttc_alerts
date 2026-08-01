import { useCallback, useState } from 'react'
import { toggleStationId } from './selectionModel.js'

export function useStationSelection(initialStationIds = []) {
  const [selectedStationIds, setSelectedStationIds] = useState(
    () => new Set(initialStationIds),
  )

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

  const replaceSelection = useCallback((stationIds) => {
    setSelectedStationIds(new Set(stationIds))
  }, [])

  return {
    selectedStationIds,
    selectedCount: selectedStationIds.size,
    toggleStation,
    selectStation,
    clearSelection,
    replaceSelection,
  }
}
