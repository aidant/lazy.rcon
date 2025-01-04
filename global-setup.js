// @ts-check
import { spawn } from 'node:child_process'
import { randomBytes, timingSafeEqual } from 'node:crypto'
import { once } from 'node:events'
import { createConnection } from 'node:net'
import { cwd } from 'node:process'
import { text } from 'node:stream/consumers'

const cli = async (input) => {
  const [command, ...args] = input.split(' ')
  const child = spawn(command, args, { cwd: cwd(), stdio: ['pipe', 'pipe', 'pipe'] })

  const [stdout, stderr, [code]] = await Promise.all([
    text(child.stdout),
    text(child.stderr),
    once(child, 'exit'),
  ])

  if (code) {
    throw new Error(stderr || 'unknown error')
  }

  return stdout
}

/*
  For whatever reason, using the AbortSignal.timeout causes the global setup to
  exit early, meanwhile using this polyfill seems to work fine just fine.

  I suspect vitest is attempting to track any unresolved async operations in the
  event loop and is for whatever reason not tracking the AbortSignal.timeout.
*/
const AbortSignal$timeout = (timeout) => {
  const controller = new AbortController()
  setTimeout(controller.abort.bind(controller), timeout)
  return controller.signal
}

const tryConnect = async () => {
  try {
    const connection = createConnection({ host: 'localhost', port: 25575 })
    const connectionTimeoutSignal = AbortSignal$timeout(250)

    await new Promise((resolve, reject) => {
      const handleConnect = () => {
        connectionTimeoutSignal.removeEventListener('abort', handleAbort)
        connection.off('connect', handleConnect)
        connection.off('error', handleError)

        resolve(undefined)
      }
      const handleError = (error) => {
        connectionTimeoutSignal.removeEventListener('abort', handleAbort)
        connection.off('connect', handleConnect)
        connection.off('error', handleError)

        try {
          connection.end()
        } catch {}

        reject(error || new Error('unknown error'))
      }
      const handleAbort = () => {
        connectionTimeoutSignal.removeEventListener('abort', handleAbort)
        connection.off('connect', handleConnect)
        connection.off('error', handleError)

        try {
          connection.end()
        } catch {}

        reject(new Error('timeout'))
      }

      connectionTimeoutSignal.addEventListener('abort', handleAbort)
      connection.on('connect', handleConnect)
      connection.on('error', handleError)
    })

    await new Promise((resolve, reject) => {
      connection.write(
        Buffer.from('12000000000000000300000070617373776f72640000', 'hex'),
        'binary',
        (error) => {
          if (error) {
            reject(error || new Error('unknown error'))
          } else {
            resolve(undefined)
          }
        },
      )
    })

    const dataTimeoutSignal = AbortSignal$timeout(250)
    await new Promise((resolve, reject) => {
      const handleData = (data) => {
        dataTimeoutSignal.removeEventListener('abort', handleAbort)
        connection.off('data', handleData)

        if (timingSafeEqual(data, Buffer.from('0a00000000000000020000000000', 'hex'))) {
          resolve(undefined)
        } else {
          reject(new Error('Invalid credentials'))
        }
      }
      const handleAbort = () => {
        dataTimeoutSignal.removeEventListener('abort', handleAbort)
        connection.off('data', handleData)

        reject(new Error('timeout'))
      }

      dataTimeoutSignal.addEventListener('abort', handleAbort)
      connection.on('data', handleData)
    })

    await new Promise((resolve) => {
      connection.end(() => resolve(undefined))
    })

    return true
  } catch (error) {
    return false
  }
}

export default async () => {
  const isAlreadyRunning = await tryConnect()

  if (isAlreadyRunning) return

  const name = `lazy-rcon-test-container-${randomBytes(8).toString('hex')}`

  await cli(
    `docker run --rm --detach --name=${name} --platform=linux/amd64 -p=25575:25575 -e=EULA=true -e=RCON_PASSWORD=password itzg/minecraft-server:latest`,
  )

  let canConnect = false
  for (let attempt = 0; attempt < 300; attempt++) {
    canConnect = await tryConnect()

    if (canConnect) {
      break
    }

    await new Promise((resolve) => setTimeout(resolve, 1000))
  }

  if (canConnect) {
    return async () => {
      await cli(`docker rm --force ${name}`)
    }
  } else {
    await cli(`docker rm --force ${name}`)

    throw new Error('Unable to start a docker container to test the minecraft connection against')
  }
}
