import { BaseEdge } from '@xyflow/react'

function getTransitPath({ sourceX, sourceY, targetX, targetY, curvePart }) {
  if (curvePart === 'into-union') {
    return `M ${sourceX} ${sourceY} C ${sourceX} ${sourceY + 105}, ${targetX + 90} ${targetY}, ${targetX} ${targetY}`
  }

  if (curvePart === 'out-of-union') {
    return `M ${sourceX} ${sourceY} C ${sourceX - 90} ${sourceY}, ${targetX} ${targetY + 105}, ${targetX} ${targetY}`
  }

  return `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`
}

export default function TransitEdge({
  data,
  id,
  sourceX,
  sourceY,
  style,
  targetX,
  targetY,
}) {
  return (
    <BaseEdge
      id={id}
      path={getTransitPath({
        sourceX,
        sourceY,
        targetX,
        targetY,
        curvePart: data?.curvePart,
      })}
      style={style}
    />
  )
}
