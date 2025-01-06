import { createConnection } from 'node:net'
import { afterAll, describe, expect, it } from 'vitest'
import { minecraft } from './minecraft.js'
import { createRconClient } from './mod.js'

describe('minecraft', () => {
  const rcon = createRconClient(
    createConnection,
    {
      host: 'localhost',
      port: 25575,
      password: 'password',
    },
    minecraft,
  )

  afterAll(() => {
    rcon.$disconnect()
  })

  describe('rcon client', () => {
    describe('basic commands', () => {
      it.each([
        {
          input: 'list',
          output: 'There are 0 of a max of 20 players online: ',
        },
        {
          input: 'whitelist list',
          output: 'There are no whitelisted players',
        },
      ])('$input', async ({ input, output }) => {
        await expect(rcon.$exec(input!)).resolves.toEqual(output)
      })
    })

    describe('connection behaviour', () => {
      const rcon = createRconClient(
        createConnection,
        {
          host: 'localhost',
          port: 25575,
          password: 'no',
        },
        minecraft,
      )

      it('throws on invalid credentials', async () => {
        await expect(rcon.list()).rejects.toThrowError('Invalid password')
      })

      it('works with valid credentials', async () => {
        rcon.$configure({ password: 'password' })
        await expect(rcon.list()).resolves.toEqual({ count: 0, max: 20, players: [] })
      })

      it('requires a disconnect before config changes are applied', async () => {
        rcon.$configure({ password: 'no' })
        await expect(rcon.list()).resolves.toEqual({ count: 0, max: 20, players: [] })
        rcon.$disconnect()
        await expect(rcon.list()).rejects.toThrowError('Invalid password')
      })
    })
  })

  describe('game client', () => {
    it.each([
      {
        id: 'list',
        params: {},
        result: { count: 0, max: 20, players: [] },
      },

      {
        id: 'whitelistOn',
        params: {},
        result: {
          status: 'whitelist_on',
        },
      },
      {
        id: 'whitelistOn',
        params: {},
        result: {
          status: 'whitelist_already_on',
        },
      },
      {
        id: 'whitelistOff',
        params: {},
        result: {
          status: 'whitelist_off',
        },
      },
      {
        id: 'whitelistOff',
        params: {},
        result: {
          status: 'whitelist_already_off',
        },
      },
      {
        id: 'whitelistAdd',
        params: { player: crypto.randomUUID() },
        result: {
          status: 'player_not_found',
        },
      },
      {
        id: 'whitelistAdd',
        params: { player: 'Notch' },
        result: {
          status: 'player_added',
        },
      },
      {
        id: 'whitelistAdd',
        params: { player: 'jeb_' },
        result: {
          status: 'player_added',
        },
      },
      {
        id: 'whitelistAdd',
        params: { player: 'Notch' },
        result: {
          status: 'player_already_added',
        },
      },
      {
        id: 'whitelist',
        params: {},
        result: {
          count: 2,
          players: ['Notch', 'jeb_'],
        },
      },
      {
        id: 'whitelistRemove',
        params: { player: crypto.randomUUID() },
        result: {
          status: 'player_not_found',
        },
      },
      {
        id: 'whitelistRemove',
        params: { player: 'jeb_' },
        result: {
          status: 'player_removed',
        },
      },
      {
        id: 'whitelistRemove',
        params: { player: 'Notch' },
        result: {
          status: 'player_removed',
        },
      },
      {
        id: 'whitelistRemove',
        params: { player: 'Notch' },
        result: {
          status: 'player_already_removed',
        },
      },
      {
        id: 'whitelistReload',
        params: {},
        result: undefined,
      },
    ])('$id', async ({ id, params, result }) => {
      await expect(rcon[id as keyof typeof rcon](params as any)).resolves.toEqual(result)
    })
  })
})
