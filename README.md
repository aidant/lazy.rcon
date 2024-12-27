# `@lazy/rcon`

## Quick start

```shell
npm i @lazy/rcon
```

### Raw rcon commands

```ts
import { createRconClient } from '@lazy/rcon'

const rcon = await createRconClient({
  host: 'localhost',
  port: 25575,
  pass: 'password',
})

console.log(await rcon.exec('whitelist add notch')) // Added Notch to the whitelist

await rcon.close()
```

### Structured rcon commands

```ts
import { createRconClient, createGameClient } from '@lazy/rcon'
import { commands } from '@lazy/rcon/minecraft'

const rcon = await createRconClient({
  host: 'localhost',
  port: 25575,
  pass: 'password',
})

const mc = createGameClient(rcon, commands)

console.log(await mc.whitelistAdd({ player: 'notch' })) // { status: 'player_added' }

await rcon.close()
```

### Custom rcon commands

```ts
import { createRconClient, createGameClient } from '@lazy/rcon'
import { commands } from '@lazy/rcon/minecraft'

const rcon = await createRconClient({
  host: 'localhost',
  port: 25575,
  pass: 'password',
})

const mc = createGameClient(rcon, {
  whitelistAdd: {
    request: {
      body: 'whitelist add {player}',
      params: {
        player: {
          type: 'string',
        },
      },
    },
    response: [
      {
        body: 'Added {player} to the whitelist',
        params: {
          status: {
            const: 'player_added',
          },
        },
      },
      {
        body: 'Player is already whitelisted',
        params: {
          status: {
            const: 'player_already_added',
          },
        },
      },
      {
        body: 'That player does not exist',
        params: {
          status: {
            const: 'player_not_found',
          },
        },
      },
    ],
  },
})

console.log(await mc.whitelistAdd({ player: 'notch' })) // { status: 'player_added' }

await rcon.close()
```

### React native

```ts
import { createRconClient } from '@lazy/rcon/byo-transport-net'
import TcpSocket from 'react-native-tcp-socket'

const rcon = await createRconClient(
  {
    host: 'localhost',
    port: 25575,
    pass: 'password',
  },
  TcpSocket.createConnection,
)
```
