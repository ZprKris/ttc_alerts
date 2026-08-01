import { useCallback, useRef, useState } from 'react'
import { getDirectionalCandidates } from './directionalNavigation.js'

export function useDirectionalSelection({ network, onSelectStation }) {
  const [activeStationId, setActiveStationId] = useState(null)
  const [announcement, setAnnouncement] = useState('')
  const [pendingDirection, setPendingDirection] = useState(null)
  const [focusRequest, setFocusRequest] = useState({
    stationId: null,
    requestId: 0,
  })
  const focusRequestId = useRef(0)

  const requestStationFocus = useCallback((stationId) => {
    focusRequestId.current += 1
    setFocusRequest({
      stationId,
      requestId: focusRequestId.current,
    })
  }, [])

  const activateStation = useCallback((stationId) => {
    setActiveStationId(stationId)
    setPendingDirection(null)
  }, [])

  const deactivateStation = useCallback((stationId) => {
    setActiveStationId((currentStationId) =>
      currentStationId === stationId ? null : currentStationId,
    )
    setPendingDirection((currentDirection) =>
      currentDirection?.sourceStationId === stationId ? null : currentDirection,
    )
  }, [])

  const chooseCandidate = useCallback(
    (candidate) => {
      onSelectStation(candidate.stationId)
      setActiveStationId(candidate.stationId)
      setPendingDirection(null)
      setAnnouncement(
        `${candidate.stationName} selected via ${candidate.routeLabel}.`,
      )
      requestStationFocus(candidate.stationId)
    },
    [onSelectStation, requestStationFocus],
  )

  const navigate = useCallback(
    (stationId, direction) => {
      const sourceStation = network.stations.find(
        (station) => station.id === stationId,
      )
      const candidates = getDirectionalCandidates(network, stationId, direction)

      if (candidates.length === 0) {
        setPendingDirection(null)
        setAnnouncement(
          `No station in the ${direction} direction from ${
            sourceStation?.name ?? 'this station'
          }.`,
        )
        return
      }

      if (candidates.length === 1) {
        chooseCandidate(candidates[0])
        return
      }

      setPendingDirection({
        sourceStationId: stationId,
        sourceStationName: sourceStation?.name ?? 'this station',
        direction,
        candidates,
      })
      setAnnouncement(
        `${candidates.length} ${direction} options. Choose a line or branch.`,
      )
    },
    [chooseCandidate, network],
  )

  const cancelPendingDirection = useCallback(() => {
    if (pendingDirection) {
      requestStationFocus(pendingDirection.sourceStationId)
      setAnnouncement(
        `Direction choice cancelled at ${pendingDirection.sourceStationName}.`,
      )
    }

    setPendingDirection(null)
  }, [pendingDirection, requestStationFocus])

  const resetDirectionalSelection = useCallback(() => {
    setActiveStationId(null)
    setPendingDirection(null)
    setAnnouncement('')
  }, [])

  return {
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
  }
}
