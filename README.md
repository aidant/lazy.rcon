# `@lazy/rcon`

## Quick start

```shell
npm i @lazy/rcon
```

### Raw rcon commands

```ts
import { createConnection } from 'node:net'
import { createRconClient } from '@lazy/rcon'

const rcon = createRconClient(createConnection, {
  host: 'localhost',
  port: 25575,
  password: 'password',
})

console.log(await rcon.$exec('whitelist add notch')) // Added Notch to the whitelist

rcon.$disconnect()
```

### Structured rcon commands

```ts
import { createConnection } from 'node:net'
import { createRconClient, minecraft } from '@lazy/rcon'

const rcon = createRconClient(
  createConnection,
  {
    host: 'localhost',
    port: 25575,
    pass: 'password',
  },
  minecraft,
)

console.log(await rcon.whitelistAdd({ player: 'notch' })) // { status: 'player_added' }

rcon.$disconnect()
```

### Custom rcon commands

```ts
import { createConnection } from 'node:net'
import { createRconClient } from '@lazy/rcon'

const rcon = createRconClient(
  createConnection,
  {
    host: 'localhost',
    port: 25575,
    pass: 'password',
  },
  {
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
  },
)

console.log(await rcon.whitelistAdd({ player: 'notch' })) // { status: 'player_added' }

rcon.$disconnect()
```

### React native

```ts
import { createRconClient } from '@lazy/rcon'
import TcpSocket from 'react-native-tcp-socket'

const rcon = createRconClient(TcpSocket.createConnection, {
  host: 'localhost',
  port: 25575,
  pass: 'password',
})
```
