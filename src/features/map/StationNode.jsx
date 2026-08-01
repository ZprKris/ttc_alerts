import { useEffect, useRef } from 'react'
import { Handle, Position } from '@xyflow/react'

const handlePositions = [
  ['top', Position.Top],
  ['right', Position.Right],
  ['bottom', Position.Bottom],
  ['left', Position.Left],
]

const directionsByKey = {
  ArrowUp: 'up',
  ArrowRight: 'right',
  ArrowDown: 'down',
  ArrowLeft: 'left',
}

export default function StationNode({ id, data }) {
  const stationType = data.isInterchange ? ', interchange' : ''
  const buttonRef = useRef(null)

  useEffect(() => {
    if (data.focusRequestId > 0) {
      buttonRef.current?.focus()
    }
  }, [data.focusRequestId])

  const handleKeyDown = (event) => {
    const direction = directionsByKey[event.key]

    if (!direction || !data.isSelected) {
      return
    }

    event.preventDefault()
    data.onDirection(id, direction)
  }

  return (
    <div
      className={`station-node${data.isInterchange ? ' is-interchange' : ''}${
        data.isSelected ? ' is-selected' : ''
      }${data.isActive ? ' is-active' : ''}`}
      data-testid="station-node"
    >
      {handlePositions.flatMap(([name, position]) => [
        <Handle
          className="station-handle"
          id={`source-${name}`}
          isConnectable={false}
          key={`source-${name}`}
          position={position}
          type="source"
        />,
        <Handle
          className="station-handle"
          id={`target-${name}`}
          isConnectable={false}
          key={`target-${name}`}
          position={position}
          type="target"
        />,
      ])}
      <button
        ref={buttonRef}
        className="station-button nodrag nopan"
        type="button"
        aria-label={`${data.name} station${stationType}`}
        aria-pressed={data.isSelected}
        data-station-id={id}
        onClick={() => data.onToggle(id, data.isSelected)}
        onFocus={() => {
          if (data.isSelected) {
            data.onActivate(id)
          }
        }}
        onKeyDown={handleKeyDown}
      >
        <span className="station-disc" aria-hidden="true" />
        <span className="station-check" aria-hidden="true">
          {data.isSelected ? '✓' : ''}
        </span>
        <span className={`station-label station-label--${data.labelPlacement}`}>
          {data.name}
        </span>
      </button>
    </div>
  )
}
