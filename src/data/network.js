import {
  connections,
  lines,
  networkMetadata,
  stations as officialStations,
} from './ttcNetwork.js'
import { createSchematicStations } from './schematicLayout.js'

export { connections, lines, networkMetadata }
export const stations = createSchematicStations(officialStations, lines)
export const sampleNetwork = Object.freeze({
  metadata: networkMetadata,
  lines,
  stations,
  connections,
})
