export default function MonitoringPanelPlaceholder({
  selectedStations,
  selectedCount,
  onClearSelection,
}) {
  const stationCountLabel = `${selectedCount} station${
    selectedCount === 1 ? '' : 's'
  } selected`

  return (
    <aside className="monitoring-card" aria-label="Monitoring setup">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Your alert</p>
          <h2>Monitoring setup</h2>
        </div>
        <div className="selection-actions">
          <span
            className="selection-count"
            aria-label={stationCountLabel}
            aria-live="polite"
          >
            {selectedCount}
          </span>
          <button
            className="clear-selection-button"
            type="button"
            disabled={selectedCount === 0}
            onClick={onClearSelection}
          >
            Clear all
          </button>
        </div>
      </div>

      {selectedCount === 0 ? (
        <div className="selection-empty">
          <span className="empty-ring" aria-hidden="true" />
          <div>
            <strong>No stations selected</strong>
            <p>Select any station on the map to begin.</p>
          </div>
        </div>
      ) : (
        <div className="selection-summary">
          <p>Selected stations</p>
          <ul aria-label="Selected stations">
            {selectedStations.map((station) => (
              <li key={station.id}>
                <span aria-hidden="true">✓</span>
                {station.name}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="panel-rule" />

      <div className="panel-preview" aria-label="Monitoring controls preview">
        <div>
          <span>Schedule</span>
          <strong>Not configured</strong>
        </div>
        <div>
          <span>Notification email</span>
          <strong>Not configured</strong>
        </div>
      </div>

      <button className="primary-button" type="button" disabled>
        Save monitoring preferences
      </button>
      <p className="panel-note">
        Schedule and email controls will be enabled in Phase 5.
      </p>
    </aside>
  )
}
