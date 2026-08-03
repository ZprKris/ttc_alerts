export default function AppHeader() {
  return (
    <header className="app-header">
      <a className="brand" href="#main-map" aria-label="TTC Station Watch home">
        <span className="brand-mark" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
        <span>
          <span className="brand-name">TTC Station Watch</span>
          <span className="brand-tagline">No more shuttle-bus surprises</span>
        </span>
      </a>
      {/* <span className="phase-badge">Verified preferences</span> */}
    </header>
  )
}
