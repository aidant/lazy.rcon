import { createRequest, createResponse, type Commands, type GameClient } from './commands.js'
import {
  deserializeRconPacket,
  RconPacketType,
  serializeRconPacket,
  type RconPacket,
} from './packet.js'
import { add } from './util-buffer.js'
import { Promise$withResolvers } from './util-promise.js'

export type RconErrorCode =
  | 'ERR_INVALID_OPTIONS'
  | 'ERR_INVALID_PASSWORD'
  | 'ERR_TCP_CONNECTION_CLOSED'
  | 'ERR_TCP_CONNECTION_OPEN'
  | 'ERR_TCP_CONNECTION'
  | 'ERR_TCP_WRITE'

export class RconError<TCode extends RconErrorCode = RconErrorCode> extends Error {
  static InvalidOptions(options?: ErrorOptions) {
    return new this(
      'ERR_INVALID_OPTIONS',
      'Invalid options: "host", "port", and "password" are required to establish a connection',
      options,
    )
  }

  static TcpConnectionOpen(options?: ErrorOptions) {
    return new this('ERR_TCP_CONNECTION_OPEN', 'Unable to establish tcp connection', options)
  }

  static TcpConnectionClosed(options?: ErrorOptions) {
    return new this('ERR_TCP_CONNECTION_CLOSED', 'The tcp connection has been closed', options)
  }

  static TcpConnection(options?: ErrorOptions) {
    return new this('ERR_TCP_CONNECTION', 'A tcp connection error occurred', options)
  }

  static TcpWrite(options?: ErrorOptions) {
    return new this('ERR_TCP_WRITE', 'Unable to write to tcp connection', options)
  }

  static InvalidPassword(options?: ErrorOptions) {
    return new this('ERR_INVALID_PASSWORD', 'Invalid password', options)
  }

  private constructor(public readonly code: TCode, message: string, options?: ErrorOptions) {
    super(message, options)
  }
}

export type RconClientOptions = {
  host?: string
  port?: number
  password?: string
}

export type RconClient = {
  $configure: (options?: RconClientOptions) => void
  $connect: (options?: RconClientOptions) => Promise<void>
  $disconnect: () => void
  $exec: (command: string) => Promise<string>
  [Symbol.dispose]: () => void
}

export type RconConnection = {
  setNoDelay?(bool?: boolean): void

  on(event: 'connect', handler: () => void): void
  on(event: 'data', handler: (data: Uint8Array) => void): void
  on(event: 'error', handler: (error?: unknown) => void): void
  on(event: 'close', handler: () => void): void

  off(event: 'connect', handler: () => void): void
  off(event: 'data', handler: (data: Uint8Array) => void): void
  off(event: 'error', handler: (error?: unknown) => void): void
  off(event: 'close', handler: () => void): void

  write(data: Uint8Array, encoding: 'binary', callback: (error?: unknown) => void): void

  end(): void
}
export type RconConnectionOptions = { host: string; port: number }
export type CreateRconConnection = (options: RconConnectionOptions) => RconConnection

export const createRconClient = <TCommands extends Commands>(
  createRconConnection: CreateRconConnection,
  options?: RconClientOptions,
  commands?: TCommands,
): RconClient & GameClient<TCommands> => {
  let host = options?.host
  let port = options?.port
  let password = options?.password

  let connection: RconConnection | undefined

  let buffer = new Uint8Array(0)
  let requestId = 0
  let requests: Record<number, PromiseWithResolvers<RconPacket>> = {}

  const handleData = (data: Uint8Array) => {
    buffer = add(buffer, data)

    while (buffer.length) {
      const [packet, remaining] = deserializeRconPacket(buffer)

      if (remaining) {
        buffer = remaining
      } else {
        buffer = new Uint8Array(0)
      }

      if (packet) {
        requests[packet.id]?.resolve(packet)
      }
    }
  }
  const handleError = (error?: unknown) => {
    for (const [_, { reject }] of Object.entries(requests)) {
      reject(RconError.TcpConnection({ cause: error }))
    }

    requests = {}

    $disconnect()
  }
  const handleClose = () => {
    for (const [_, { reject }] of Object.entries(requests)) {
      reject(RconError.TcpConnectionClosed())
    }

    requests = {}

    $disconnect()
  }

  const $configure = (options?: RconClientOptions) => {
    if (options?.host) host = options.host
    if (options?.port) port = options.port
    if (options?.password) password = options.password
  }
  const $connect = async (options?: RconClientOptions): Promise<RconConnection> => {
    $configure(options)

    if (!host || !port || !password) {
      throw RconError.InvalidOptions()
    }

    const connection = createRconConnection({ host, port })

    await new Promise<void>((resolve, reject) => {
      const handleConnect = () => {
        connection.off('connect', handleConnect)
        connection.off('error', handleError)

        resolve()
      }
      const handleError = (error: unknown) => {
        connection.off('connect', handleConnect)
        connection.off('error', handleError)

        reject(RconError.TcpConnectionOpen({ cause: error }))
      }

      connection.on('connect', handleConnect)
      connection.on('error', handleError)
    })

    connection.on('data', handleData)
    connection.on('error', handleError)
    connection.on('close', handleClose)

    if (!password) {
      throw RconError.InvalidPassword()
    }

    const auth = await $exec(connection, RconPacketType.Auth, password)

    if (auth.id === -1) {
      throw RconError.InvalidPassword()
    }

    return connection
  }
  const $disconnect = (): void => {
    if (!connection) {
      return
    }

    connection.off('data', handleData)
    connection.off('error', handleError)
    connection.off('close', handleClose)

    try {
      connection.end()
    } catch {}

    for (const [_, { reject }] of Object.entries(requests)) {
      reject(RconError.TcpConnectionClosed())
    }

    requestId = 0
    requests = {}
    connection = undefined
  }
  const $exec = async (
    connection: RconConnection,
    type: RconPacketType,
    body: string,
  ): Promise<RconPacket> => {
    const packet = {
      id: requestId++,
      type,
      body,
    }

    const resolvers = (requests[packet.id] = Promise$withResolvers())

    if (type === RconPacketType.Auth) {
      requests[-1] = resolvers
    }

    const payload = serializeRconPacket(packet)

    await new Promise<void>((resolve, reject) => {
      connection.write(payload, 'binary', (error) => {
        if (error) {
          reject(RconError.TcpWrite({ cause: error }))
        } else {
          resolve()
        }
      })
    })

    try {
      return await resolvers.promise
    } finally {
      delete requests[packet.id]

      if (type === RconPacketType.Auth) {
        delete requests[-1]
      }
    }
  }

  const rcon = {
    $configure,
    $connect: async (options) => {
      $disconnect()
      connection = await $connect(options)
    },
    $disconnect,
    $exec: async (command) => {
      connection ||= await $connect()
      const packet = await $exec(connection, RconPacketType.ExecCommand, command)
      return packet.body
    },
    [Symbol.dispose]: $disconnect,
  } satisfies RconClient

  return Object.assign(
    Object.create(null),
    rcon,
    Object.fromEntries(
      Object.entries(commands || {}).map(([property, command]) => [
        property,
        async (options: Record<PropertyKey, unknown>) => {
          return createResponse(command, await rcon.$exec(createRequest(command, options)))
        },
      ]),
    ) as unknown as GameClient<TCommands>,
  )
}
