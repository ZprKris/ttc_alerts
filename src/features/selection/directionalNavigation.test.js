import { describe, expect, it } from 'vitest'
import { sampleNetwork } from '../../data/network.js'
import { getDirectionalCandidates } from './directionalNavigation.js'

describe('ordered directional navigation', () => {
  it('follows an ordinary line in station order', () => {
    const candidates = getDirectionalCandidates(sampleNetwork, 'cedar', 'down')

    expect(candidates).toHaveLength(1)
    expect(candidates[0]).toMatchObject({
      stationId: 'central',
      lineId: 'line-amber',
    })
  })

  it('returns no candidate past a terminal station', () => {
    expect(getDirectionalCandidates(sampleNetwork, 'northgate', 'up')).toEqual(
      [],
    )
  })

  it('uses the arrow direction to choose a line at an interchange', () => {
    expect(
      getDirectionalCandidates(sampleNetwork, 'central', 'up')[0],
    ).toMatchObject({ stationId: 'cedar', lineId: 'line-amber' })
    expect(
      getDirectionalCandidates(sampleNetwork, 'central', 'right')[0],
    ).toMatchObject({ stationId: 'market', lineId: 'line-green' })
  })

  it('returns every ordered option when a branch direction is ambiguous', () => {
    const candidates = getDirectionalCandidates(
      sampleNetwork,
      'market',
      'right',
    )

    expect(candidates).toHaveLength(2)
    expect(candidates.map((candidate) => candidate.stationId)).toEqual([
      'riverside',
      'hillcrest',
    ])
    expect(candidates[1]).toMatchObject({
      branchId: 'green-hill-branch',
      branchName: 'Hill branch',
    })
  })
})
