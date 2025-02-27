import { createRequest, createResponse, type Commands, type GameClient } from './commands.js'
import {
  deserializeRconPacket,
  RconPacketType,
  serializeRconPacket,
  type RconPacket,
} from './packet.js'
import { AbortSignal$timeout } from './util-abort-signal.js'
import { add } from './util-buffer.js'
import { Promise$withResolvers } from './util-promise.js'

export type RconErrorCode =
  | 'ERR_INVALID_OPTIONS'
  | 'ERR_INVALID_PASSWORD'
  | 'ERR_TCP_CONNECTION_CLOSED'
  | 'ERR_TCP_CONNECTION_OPEN'
  | 'ERR_TCP_CONNECTION'
  | 'ERR_TCP_WRITE'
  | 'ERR_TIMEOUT'

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

  static Timeout(options?: ErrorOptions) {
    return new this('ERR_TIMEOUT', 'The operation timed out', options)
  }

  private constructor(public readonly code: TCode, message: string, options?: ErrorOptions) {
    super(message, options)
  }
}

export type RconClientOptions = {
  host?: string
  port?: number
  password?: string
  timeout?: number
}

export type RconStats = {
  isConnected: boolean
  lastResponseLatencyInMs: number | undefined
  lastResponseTimestampInMs: number | undefined
}

export type RconClient = {
  $stats: () => RconStats
  $observeStats: (observer: (stats: RconStats) => void) => () => void
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
  let timeout = options?.timeout ?? 2500

  let connection: RconConnection | undefined
  let connectionObservers: Set<(stats: RconStats) => void> = new Set()

  let buffer = new Uint8Array(0)
  let requestId = 0
  let requests: Record<
    number,
    {
      requestTimestamp: Date
      responseTimestamp: Date | undefined
      resolvers: PromiseWithResolvers<RconPacket>
    }
  > = {}
  let lastResponse:
    | {
        id: number
        requestTimestamp: Date
        responseTimestamp: Date
      }
    | undefined

  const handleData = (data: Uint8Array) => {
    const now = new Date()

    buffer = add(buffer, data)

    while (buffer.length) {
      const [packet, remaining] = deserializeRconPacket(buffer)

      if (remaining) {
        buffer = remaining
      } else {
        buffer = new Uint8Array(0)
      }

      if (packet) {
        const metadata = requests[packet.id]
        if (metadata) {
          metadata.responseTimestamp = now
          metadata.resolvers.resolve(packet)
        }
      }
    }
  }
  const handleError = (error?: unknown) => {
    for (const [
      _,
      {
        resolvers: { reject },
      },
    ] of Object.entries(requests)) {
      reject(RconError.TcpConnection({ cause: error }))
    }

    requests = {}

    $disconnect()
  }
  const handleClose = () => {
    for (const [
      _,
      {
        resolvers: { reject },
      },
    ] of Object.entries(requests)) {
      reject(RconError.TcpConnectionClosed())
    }

    requests = {}

    $disconnect()
  }

  const $stats = (connection: RconConnection | undefined) => ({
    isConnected: !!connection,
    lastResponseLatencyInMs:
      lastResponse?.responseTimestamp === undefined
        ? undefined
        : lastResponse.responseTimestamp!.getTime() - lastResponse.requestTimestamp!.getTime(),
    lastResponseTimestampInMs: lastResponse?.responseTimestamp?.getTime(),
  })
  const $configure = (options?: RconClientOptions) => {
    if (options?.host) host = options.host
    if (options?.port) port = options.port
    if (options?.password) password = options.password
    if (options?.timeout) timeout = options.timeout
  }
  const $connect = async (options?: RconClientOptions): Promise<RconConnection> => {
    $configure(options)

    if (!host || !port) {
      throw RconError.InvalidOptions()
    }

    if (!password) {
      throw RconError.InvalidPassword()
    }

    let timeoutSignal = timeout === 0 ? undefined : AbortSignal$timeout(timeout)

    const connection = createRconConnection({ host, port })

    await new Promise<void>((resolve, reject) => {
      const handleConnect = () => {
        timeoutSignal?.removeEventListener('abort', handleAbort)
        connection.off('connect', handleConnect)
        connection.off('error', handleError)

        resolve()
      }
      const handleError = (error: unknown) => {
        timeoutSignal?.removeEventListener('abort', handleAbort)
        connection.off('connect', handleConnect)
        connection.off('error', handleError)

        try {
          connection.end()
        } catch {}

        reject(RconError.TcpConnectionOpen({ cause: error }))
      }
      const handleAbort = () => {
        timeoutSignal?.removeEventListener('abort', handleAbort)
        connection.off('connect', handleConnect)
        connection.off('error', handleError)

        try {
          connection.end()
        } catch {}

        reject(RconError.Timeout())
      }

      timeoutSignal?.addEventListener('abort', handleAbort)
      connection.on('connect', handleConnect)
      connection.on('error', handleError)
    })

    connection.on('data', handleData)
    connection.on('error', handleError)
    connection.on('close', handleClose)

    const auth = await $exec(connection, RconPacketType.Auth, password)

    if (auth.id === -1) {
      throw RconError.InvalidPassword()
    }

    for (const observer of connectionObservers) {
      observer($stats(connection))
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

    for (const [
      _,
      {
        resolvers: { reject },
      },
    ] of Object.entries(requests)) {
      reject(RconError.TcpConnectionClosed())
    }

    requestId = 0
    requests = {}
    lastResponse = undefined
    connection = undefined

    for (const observer of connectionObservers) {
      observer($stats(connection))
    }
  }
  const $exec = async (
    connection: RconConnection,
    type: RconPacketType,
    body: string,
  ): Promise<RconPacket> => {
    const timeoutSignal = timeout === 0 ? undefined : AbortSignal$timeout(timeout)
    const timeoutPromise = !timeoutSignal
      ? undefined
      : new Promise<never>((_resolve, reject) => {
          const handleAbort = () => {
            timeoutSignal.removeEventListener('abort', handleAbort)

            reject(RconError.Timeout())
          }

          timeoutSignal.addEventListener('abort', handleAbort)
        })

    const packet = {
      id: requestId++,
      type,
      body,
    }

    const metadata = (requests[packet.id] = {
      requestTimestamp: new Date(),
      responseTimestamp: undefined,
      resolvers: Promise$withResolvers(),
    })

    if (type === RconPacketType.Auth) {
      requests[-1] = metadata
    }

    const payload = serializeRconPacket(packet)

    const writePromise = new Promise<void>((resolve, reject) => {
      connection.write(payload, 'binary', (error) => {
        if (error) {
          reject(RconError.TcpWrite({ cause: error }))
        } else {
          resolve()
        }
      })
    })

    await Promise.race(timeoutPromise ? [writePromise, timeoutPromise] : [writePromise])

    try {
      return await Promise.race(
        timeoutPromise
          ? [metadata.resolvers.promise, timeoutPromise]
          : [metadata.resolvers.promise],
      )
    } finally {
      if (!lastResponse || packet.id > lastResponse.id) {
        const metadata = requests[packet.id]

        if (metadata?.responseTimestamp) {
          lastResponse = {
            id: packet.id,
            requestTimestamp: metadata.requestTimestamp,
            responseTimestamp: metadata.responseTimestamp,
          }

          for (const observer of connectionObservers) {
            observer($stats(connection))
          }
        }
      }

      delete requests[packet.id]

      if (type === RconPacketType.Auth) {
        delete requests[-1]
      }
    }
  }

  const rcon = {
    $stats: () => {
      return $stats(connection)
    },
    $observeStats: (observer) => {
      connectionObservers.add(observer)
      observer($stats(connection))

      return () => {
        connectionObservers.delete(observer)
      }
    },
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
