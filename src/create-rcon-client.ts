import { deserializeRconPacket, RconPacketType, serializeRconPacket } from './packet.js'
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
  const requests: Record<number, PromiseWithResolvers<string>> = {}

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
        requests[rconPacket.id]?.resolve(rconPacket.body)
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

    await transport.write(serializeRconPacket(rconPacket))

    return promise
  }

  await write(RconPacketType.Auth, options.pass)

  return {
    exec: async (cmd: string) => {
      return write(RconPacketType.ExecCommand, cmd)
    },
    close: () => {
      transport.close()
    },
  }
}
