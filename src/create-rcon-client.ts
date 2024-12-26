import {
  deserializeRconPacket,
  RconPacketType,
  serializeRconPacket,
  type RconPacket,
} from './packet.js'
import { Promise$withResolvers } from './util-promise.js'
import type { CreateConnectionOptions } from './with-transport-net.js'

export type CreateRconClientOptions = {
  host: string
  port: number
  pass: string
}

export type Transport = (options: {
  onRead: (data: Uint8Array) => void
  onError: (error?: unknown) => void
}) => {
  write: (data: Uint8Array) => Promise<void>
  close: () => void
}

export type WithTransportOptions = {
  host: string
  port: number
}

export type WithTransport = (options: WithTransportOptions) => Promise<Transport>

export type RconClient = {
  exec: (cmd: string) => Promise<string>
  close: () => void
}

export const createRconClient = async (
  options: CreateRconClientOptions,
  withTransport: (options: CreateConnectionOptions) => Promise<Transport>,
): Promise<RconClient> => {
  const createTransport = await withTransport(options)

  let requestId = 0
  const requests: Record<number, PromiseWithResolvers<RconPacket>> = {}

  let buffer = new Uint8Array(0)
  const transport = createTransport({
    onRead: (data) => {
      const newBuffer = new Uint8Array(buffer.length + data.length)
      newBuffer.set(buffer, 0)
      newBuffer.set(data, buffer.length)
      buffer = newBuffer

      const [rconPacket, remaining] = deserializeRconPacket(buffer)

      if (remaining) {
        buffer = remaining
      } else {
        buffer = new Uint8Array(0)
      }

      if (rconPacket) {
        requests[rconPacket.id]?.resolve(rconPacket)
      }
    },
    onError: () => {},
  })

  const write = async (type: RconPacketType, body: string) => {
    const rconPacket = {
      id: requestId++,
      type: type,
      body,
    }

    const { promise } = (requests[rconPacket.id] = Promise$withResolvers())

    if (type === RconPacketType.Auth) {
      requests[-1] = requests[rconPacket.id]!
    }

    await transport.write(serializeRconPacket(rconPacket))

    return promise
  }

  const authResponse = await write(RconPacketType.Auth, options.pass)

  if (authResponse.id === -1) {
    throw new Error('Unable to establish an rcon connection, the password provided is invalid')
  }

  return {
    exec: async (cmd: string) => {
      const packet = await write(RconPacketType.ExecCommand, cmd)
      return packet.body
    },
    close: () => {
      transport.close()
    },
  }
}
