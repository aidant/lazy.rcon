# `@lazy/rcon`

## Quick start

```shell
npm i @lazy/rcon
```

```ts
import { createRconClient } from '@lazy/rcon'

const rcon = await createRconClient({
  host: 'localhost',
  port: 25575,
  pass: 'password',
})

console.log(await rcon.exec('help'))

await rcon.close()
```
