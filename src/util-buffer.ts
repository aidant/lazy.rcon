export const hex = (hex: string): Uint8Array<ArrayBuffer> => new Uint8Array(Buffer.from(hex, 'hex'))
export const add = (a: Uint8Array, b: Uint8Array): Uint8Array<ArrayBuffer> => {
  const buffer = new Uint8Array(a.length + b.length)
  buffer.set(a, 0)
  buffer.set(b, a.length)
  return buffer
}
