const Endianness = {
  LE: true,
  BE: false,
} as const
type Endianness = (typeof Endianness)[keyof typeof Endianness]

export const RconPacketType = {
  ResponseValue: 0,
  ExecCommand: 2,
  AuthResponse: 2,
  Auth: 3,
} as const
export type RconPacketType = (typeof RconPacketType)[keyof typeof RconPacketType]

export type RconPacket = {
  id: number
  type: number
  body: string
}

const encoder = new TextEncoder()
const decoder = new TextDecoder()

export const serializeRconPacket = (rconPacket: RconPacket): Uint8Array => {
  const body = encoder.encode(rconPacket.body)
  const data = new DataView(new ArrayBuffer(body.length + 14))

  data.setInt32(0, 10 + body.length, Endianness.LE)
  data.setInt32(4, rconPacket.id, Endianness.LE)
  data.setInt32(8, rconPacket.type, Endianness.LE)
  for (let i = 0; i < body.length; i++) {
    data.setUint8(12 + i, body[i] || 0)
  }

  return new Uint8Array(data.buffer)
}

export const deserializeRconPacket = (
  packet: Uint8Array<ArrayBuffer>,
): [RconPacket | null, Uint8Array<ArrayBuffer> | null] => {
  const data = new DataView(packet.buffer, packet.byteOffset, packet.byteLength)

  const length = data.getInt32(0, Endianness.LE)

  if (length + 4 > data.byteLength) {
    return [null, packet]
  }

  const id = data.getInt32(4, Endianness.LE)
  const type = data.getInt32(8, Endianness.LE)
  const body = new Uint8Array(length - 10)
  for (let i = 0; i < body.length; i++) {
    body[i] = data.getUint8(12 + i)
  }

  const rconPacket = {
    id,
    type,
    body: decoder.decode(body),
  }
  let remainder = null

  if (length + 4 < data.byteLength) {
    remainder = new Uint8Array(data.byteLength - length - 4)

    for (let i = 0; i < remainder.length; i++) {
      remainder[i] = data.getUint8(length + 4 + i)
    }
  }

  return [rconPacket, remainder]
}
