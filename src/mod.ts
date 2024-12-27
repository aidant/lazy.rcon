import { createConnection } from 'node:net'
import {
  type Command,
  type Commands,
  createGameClient,
  type GameClient,
} from './create-game-client.js'
import {
  createRconClient as _createRconClient,
  type CreateRconClientOptions,
  type RconClient,
} from './create-rcon-client.js'
import { withTransportNet } from './with-transport-net.js'

export const createRconClient = (options: CreateRconClientOptions) => {
  return _createRconClient(options, withTransportNet(createConnection))
}

export {
  createGameClient,
  type Command,
  type Commands,
  type CreateRconClientOptions,
  type GameClient,
  type RconClient,
}
