import type { Transport } from './create-rcon-client.js'

export type CreateConnectionOptions = {
  host: string
  port: number
}

export type CreateConnectionFn = (
  options: { host: string; port: number },
  callback: () => void,
) => {
  setNoDelay?(bool?: boolean): void

  on(event: 'connect', handler: () => void): void
  on(event: 'error', handler: (error?: unknown) => void): void
  on(event: 'data', handler: (data: Uint8Array) => void): void

  off(event: 'connect', handler: () => void): void
  off(event: 'error', handler: (error?: unknown) => void): void
  off(event: 'data', handler: (data: Uint8Array) => void): void

  write(data: Uint8Array, encoding: 'binary', callback: (error?: unknown) => void): void

  end(): void
}

export const withTransportNet = (createConnection: CreateConnectionFn) => {
  return async (options: CreateConnectionOptions): Promise<Transport> => {
    const socket = createConnection({ host: options.host, port: options.port }, () => {})

    await new Promise<void>((resolve, reject) => {
      const handleConnect = () => {
        socket.off('connect', handleConnect)
        socket.off('error', handleError)

        resolve()
      }
      const handleError = (error: unknown) => {
        socket.off('connect', handleConnect)
        socket.off('error', handleError)

        reject(error)
      }

      socket.on('connect', handleConnect)
      socket.on('error', handleError)
    })

    try {
      socket.setNoDelay?.(true)
    } catch {}

    return ({ onRead, onError }) => {
      socket.on('data', onRead)
      socket.on('error', onError)

      return {
        write: (data) => {
          return new Promise<void>((resolve, reject) => {
            socket.write(data, 'binary', (error) => {
              if (error) {
                reject(error)
              } else {
                resolve()
              }
            })
          })
        },
        close: () => {
          socket.off('data', onRead)
          socket.off('error', onError)

          socket.end()
        },
      }
    }
  }
}
