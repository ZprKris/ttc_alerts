import { describe, expect, it } from 'vitest'
import { sampleNetwork } from '../../data/network.js'
import { getDirectionalCandidates } from './directionalNavigation.js'

describe('ordered directional navigation', () => {
  it('follows an ordinary line in station order', () => {
    const candidates = getDirectionalCandidates(sampleNetwork, 'north-york-centre', 'down')

    expect(candidates).toHaveLength(1)
    expect(candidates[0]).toMatchObject({
      stationId: 'sheppard-yonge',
      lineId: 'line-1',
    })
  })

  it('returns no candidate past a terminal station', () => {
    expect(getDirectionalCandidates(sampleNetwork, 'finch', 'up')).toEqual(
      [],
    )
  })

  it('uses the arrow direction to choose a line at an interchange', () => {
    expect(
      getDirectionalCandidates(sampleNetwork, 'st-george', 'left')[0],
    ).toMatchObject({ stationId: 'spadina', lineId: 'line-1' })
    expect(
      getDirectionalCandidates(sampleNetwork, 'st-george', 'right')[0],
    ).toMatchObject({ stationId: 'museum', lineId: 'line-1' })
  })

  it('returns every ordered option when a branch direction is ambiguous', () => {
    const candidates = getDirectionalCandidates(sampleNetwork, 'st-george', 'left')
    expect(candidates).toHaveLength(2)
    expect(candidates.map((candidate) => candidate.lineId)).toEqual(['line-1', 'line-2'])
  })
})
