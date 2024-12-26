import { createConnection } from 'node:net'
import {
  createRconClient as _createRconClient,
  type CreateRconClientOptions,
  type RconClient,
} from './create-rcon-client.js'
import { withTransportNet } from './with-transport-net.js'

export const createRconClient = (options: CreateRconClientOptions) => {
  return _createRconClient(options, withTransportNet(createConnection))
}

export type { CreateRconClientOptions, RconClient }
