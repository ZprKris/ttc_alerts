import { describe, expect, it } from 'vitest'
import { sampleNetwork } from '../../data/network.js'
import { createFlowElements } from './createFlowElements.js'

describe('createFlowElements', () => {
  it('creates non-editable stations above thick coloured line segments', () => {
    const { nodes, edges } = createFlowElements(sampleNetwork)

    expect(nodes).toHaveLength(sampleNetwork.stations.length)
    expect(edges).toHaveLength(sampleNetwork.connections.length)
    expect(nodes.every((node) => node.draggable === false)).toBe(true)
    expect(nodes.every((node) => node.style.pointerEvents === 'all')).toBe(true)
    expect(nodes.every((node) => node.zIndex > edges[0].zIndex)).toBe(true)
    expect(edges.every((edge) => edge.style.strokeWidth === 14)).toBe(true)
    expect(edges.every((edge) => edge.reconnectable === false)).toBe(true)
  })

  it('marks the shared station as an interchange', () => {
    const { nodes } = createFlowElements(sampleNetwork)
    const central = nodes.find((node) => node.id === 'sheppard-yonge')

    expect(central.data.isInterchange).toBe(true)
    expect(central.data.lineIds).toEqual(['line-1', 'line-4'])
  })
})
