import {
  createGameClient,
  type Command,
  type Commands,
  type GameClient,
} from './create-game-client.js'
import {
  createRconClient as _createRconClient,
  type CreateRconClientOptions,
  type RconClient,
} from './create-rcon-client.js'
import { withTransportNet, type CreateConnectionFn } from './with-transport-net.js'

export const createRconClient = (
  options: CreateRconClientOptions,
  createConnection: CreateConnectionFn,
) => {
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
