import { describe, expect, it } from 'vitest'
import { sampleNetwork } from '../../data/network.js'
import { getDirectionalCandidates } from './directionalNavigation.js'

describe('ordered directional navigation', () => {
  const expectSequence = (stationIds, direction) => {
    stationIds.slice(0, -1).forEach((stationId, index) => {
      expect(
        getDirectionalCandidates(sampleNetwork, stationId, direction).map(
          (candidate) => candidate.stationId,
        ),
      ).toContain(stationIds[index + 1])
    })
  }

  it('follows an ordinary line in station order', () => {
    const candidates = getDirectionalCandidates(
      sampleNetwork,
      'north-york-centre',
      'down',
    )

    expect(candidates).toHaveLength(1)
    expect(candidates[0]).toMatchObject({
      stationId: 'sheppard-yonge',
      lineId: 'line-1',
    })
  })

  it('follows the displayed vertical geometry on the University branch', () => {
    const northToSouthStations = [
      'vaughan-metropolitan-centre-station',
      'highway-407',
      'pioneer-village',
      'york-university',
      'finch-west',
      'downsview-park',
      'sheppard-west',
      'wilson',
      'yorkdale',
      'lawrence-west',
      'glencairn',
      'cedarvale',
      'st-clair-west',
      'dupont',
      'spadina',
    ]

    expectSequence(northToSouthStations, 'down')
  })

  it('follows every displayed straight line in its visual direction', () => {
    expectSequence(
      [
        'finch',
        'north-york-centre',
        'sheppard-yonge',
        'york-mills',
        'lawrence',
        'eglinton',
        'davisville',
        'st-clair',
        'summerhill',
        'rosedale',
        'yonge',
        'wellesley',
        'college',
        'tmu',
        'queen',
        'king',
      ],
      'down',
    )
    expectSequence(
      sampleNetwork.lines.find((line) => line.id === 'line-2')
        .orderedStationIds,
      'right',
    )
    expectSequence(
      sampleNetwork.lines.find((line) => line.id === 'line-4')
        .orderedStationIds,
      'right',
    )
  })

  it('treats the equal diagonal into the Union curve as vertical', () => {
    expect(
      getDirectionalCandidates(sampleNetwork, 'king', 'down')[0],
    ).toMatchObject({ stationId: 'union', lineId: 'line-1' })
    expect(
      getDirectionalCandidates(sampleNetwork, 'st-andrew', 'down')[0],
    ).toMatchObject({ stationId: 'union', lineId: 'line-1' })
  })

  it('returns no candidate past a terminal station', () => {
    expect(getDirectionalCandidates(sampleNetwork, 'finch', 'up')).toEqual([])
  })

  it('uses the arrow direction to choose a line at an interchange', () => {
    expect(
      getDirectionalCandidates(sampleNetwork, 'st-george', 'left')[0],
    ).toMatchObject({ stationId: 'spadina', lineId: 'line-1' })
    expect(
      getDirectionalCandidates(sampleNetwork, 'st-george', 'right')[0],
    ).toMatchObject({ stationId: 'bay', lineId: 'line-2' })
    expect(
      getDirectionalCandidates(sampleNetwork, 'st-george', 'down')[0],
    ).toMatchObject({ stationId: 'museum', lineId: 'line-1' })
  })

  it('returns every ordered option when a branch direction is ambiguous', () => {
    const candidates = getDirectionalCandidates(
      sampleNetwork,
      'st-george',
      'left',
    )
    expect(candidates).toHaveLength(2)
    expect(candidates.map((candidate) => candidate.lineId)).toEqual([
      'line-1',
      'line-2',
    ])
  })
})
