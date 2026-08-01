const directionDetails = {
  up: { arrow: '↑', label: 'up' },
  right: { arrow: '→', label: 'right' },
  down: { arrow: '↓', label: 'down' },
  left: { arrow: '←', label: 'left' },
}

function getButtonLabel(station, direction, candidates) {
  if (candidates.length === 0) {
    return `No station ${direction} from ${station.name}`
  }

  if (candidates.length === 1) {
    return `Select ${candidates[0].stationName} ${direction} via ${candidates[0].routeLabel}`
  }

  return `Choose between ${candidates.length} routes ${direction} from ${station.name}`
}

function DirectionPad({ station, directionOptions, onNavigate }) {
  return (
    <div className="direction-pad nodrag nopan" aria-label="Direction controls">
      <p>
        Continue from <strong>{station.name}</strong>
      </p>
      <div className="direction-pad-grid">
        {Object.entries(directionDetails).map(
          ([direction, { arrow, label }]) => {
            const candidates = directionOptions[direction]
            const uniqueCandidate =
              candidates.length === 1 ? candidates[0] : null

            return (
              <button
                className={`direction-button direction-button--${direction}`}
                type="button"
                aria-label={getButtonLabel(station, label, candidates)}
                disabled={candidates.length === 0}
                key={direction}
                onClick={() => onNavigate(station.id, direction)}
              >
                <span className="direction-arrow" aria-hidden="true">
                  {arrow}
                </span>
                {uniqueCandidate ? (
                  <span
                    className="direction-line-badge"
                    style={{
                      '--line-color': uniqueCandidate.lineColor,
                      '--line-text-color': uniqueCandidate.lineTextColor,
                    }}
                    aria-hidden="true"
                  >
                    {uniqueCandidate.lineShortName}
                  </span>
                ) : null}
                {candidates.length > 1 ? (
                  <span className="direction-option-count" aria-hidden="true">
                    {candidates.length}
                  </span>
                ) : null}
              </button>
            )
          },
        )}
        <span className="direction-pad-centre" aria-hidden="true">
          {station.name.slice(0, 1)}
        </span>
      </div>
    </div>
  )
}

function DirectionChoice({ pendingDirection, onChoose, onCancel }) {
  return (
    <div
      className="direction-choice nodrag nopan"
      role="dialog"
      aria-labelledby="direction-choice-heading"
    >
      <p className="eyebrow">Multiple routes</p>
      <h3 id="direction-choice-heading">
        Choose a {pendingDirection.direction} branch
      </h3>
      <p>From {pendingDirection.sourceStationName}</p>
      <div className="direction-choice-list">
        {pendingDirection.candidates.map((candidate, index) => (
          <button
            type="button"
            autoFocus={index === 0}
            key={`${candidate.stationId}:${candidate.branchId ?? 'main'}`}
            onClick={() => onChoose(candidate)}
          >
            <span
              className="direction-route-swatch"
              style={{ '--line-color': candidate.lineColor }}
              aria-hidden="true"
            />
            <span>
              <strong>{candidate.stationName}</strong>
              <small>{candidate.routeLabel}</small>
            </span>
          </button>
        ))}
      </div>
      <button className="direction-cancel" type="button" onClick={onCancel}>
        Cancel
      </button>
    </div>
  )
}

export default function DirectionalControls({
  activeStation,
  directionOptions,
  pendingDirection,
  onNavigate,
  onChoose,
  onCancel,
}) {
  return (
    <>
      {activeStation && directionOptions && !pendingDirection ? (
        <DirectionPad
          station={activeStation}
          directionOptions={directionOptions}
          onNavigate={onNavigate}
        />
      ) : null}
      {pendingDirection ? (
        <DirectionChoice
          pendingDirection={pendingDirection}
          onChoose={onChoose}
          onCancel={onCancel}
        />
      ) : null}
    </>
  )
}
