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
          input: 'help',
          output: [
            '/advancement (grant|revoke)',
            '/attribute <target> <attribute> (get|base|modifier)',
            '/execute (run|if|unless|as|at|store|positioned|rotated|facing|align|anchored|in|summon|on)',
            '/bossbar (add|remove|list|set|get)',
            '/clear [<targets>]',
            '/clone (<begin>|from)',
            '/damage <target> <amount> [<damageType>]',
            '/data (merge|get|remove|modify)',
            '/datapack (enable|disable|list)',
            '/debug (start|stop|function)',
            '/defaultgamemode <gamemode>',
            '/difficulty [peaceful|easy|normal|hard]',
            '/effect (clear|give)',
            '/me <action>',
            '/enchant <targets> <enchantment> [<level>]',
            '/experience (add|set|query)',
            '/xp -> experience',
            '/fill <from> <to> <block> [replace|keep|outline|hollow|destroy]',
            '/fillbiome <from> <to> <biome> [replace]',
            '/forceload (add|remove|query)',
            '/function <name> [<arguments>|with]',
            '/gamemode <gamemode> [<target>]',
            '/gamerule (announceAdvancements|blockExplosionDropDecay|commandBlockOutput|commandModificationBlockLimit|disableElytraMovementCheck|disablePlayerMovementCheck|disableRaids|doDaylightCycle|doEntityDrops|doFireTick|doImmediateRespawn|doInsomnia|doLimitedCrafting|doMobLoot|doMobSpawning|doPatrolSpawning|doTileDrops|doTraderSpawning|doVinesSpread|doWardenSpawning|doWeatherCycle|drowningDamage|enderPearlsVanishOnDeath|fallDamage|fireDamage|forgiveDeadPlayers|freezeDamage|globalSoundEvents|keepInventory|lavaSourceConversion|logAdminCommands|maxCommandChainLength|maxCommandForkCount|maxEntityCramming|mobExplosionDropDecay|mobGriefing|naturalRegeneration|playersNetherPortalCreativeDelay|playersNetherPortalDefaultDelay|playersSleepingPercentage|projectilesCanBreakBlocks|randomTickSpeed|reducedDebugInfo|sendCommandFeedback|showDeathMessages|snowAccumulationHeight|spawnChunkRadius|spawnRadius|spectatorsGenerateChunks|tntExplosionDropDecay|universalAnger|waterSourceConversion)',
            '/give <targets> <item> [<count>]',
            '/help [<command>]',
            '/item (replace|modify)',
            '/kick <targets> [<reason>]',
            '/kill [<targets>]',
            '/list [uuids]',
            '/locate (structure|biome|poi)',
            '/loot (replace|insert|give|spawn)',
            '/msg <targets> <message>',
            '/tell -> msg',
            '/w -> msg',
            '/particle <name> [<pos>]',
            '/place (feature|jigsaw|structure|template)',
            '/playsound <sound> [master|music|record|weather|block|hostile|neutral|player|ambient|voice]',
            '/random (value|roll|reset)',
            '/reload',
            '/recipe (give|take)',
            '/return (<value>|fail|run)',
            '/ride <target> (mount|dismount)',
            '/rotate <target> (<rotation>|facing)',
            '/say <message>',
            '/schedule (function|clear)',
            '/scoreboard (objectives|players)',
            '/seed',
            '/setblock <pos> <block> [destroy|keep|replace]',
            '/spawnpoint [<targets>]',
            '/setworldspawn [<pos>]',
            '/spectate [<target>]',
            '/spreadplayers <center> <spreadDistance> <maxRange> (<respectTeams>|under)',
            '/stopsound <targets> [*|master|music|record|weather|block|hostile|neutral|player|ambient|voice]',
            '/summon <entity> [<pos>]',
            '/tag <targets> (add|remove|list)',
            '/team (list|add|remove|empty|join|leave|modify)',
            '/teammsg <message>',
            '/tm -> teammsg',
            '/teleport (<location>|<destination>|<targets>)',
            '/tp -> teleport',
            '/tellraw <targets> <message>',
            '/tick (query|rate|step|sprint|unfreeze|freeze)',
            '/time (set|add|query)',
            '/title <targets> (clear|reset|title|subtitle|actionbar|times)',
            '/trigger <objective> [add|set]',
            '/weather (clear|rain|thunder)',
            '/worldborder (add|set|center|damage|get|warning)',
            '/jfr (start|stop)',
            '/ban-ip <target> [<reason>]',
            '/banlist [ips|players]',
            '/ban <targets> [<reason>]',
            '/deop <targets>',
            '/op <targets>',
            '/pardon <targets>',
            '/pardon-ip <target>',
            '/perf (start|stop)',
            '/save-all [flush]',
            '/save-off',
            '/save-on',
            '/setidletimeout <minutes>',
            '/stop',
            '/transfer <hostname> [<port>]',
            '/whitelist (on|off|list|add|remove|reload)',
          ].join(''),
        },
        {
          input: 'list',
          output: 'There are 0 of a max of 20 players online: ',
        },
        {
          input: 'whitelist list',
          output: 'There are no whitelisted players',
        },
        {
          input: 'worldborder get',
          output: 'The world border is currently 59999968 block(s) wide',
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
        params: { player: 'notch' },
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
        params: { player: 'notch' },
        result: {
          status: 'player_already_added',
        },
      },
      {
        id: 'whitelist',
        params: {},
        result: {
          count: 2,
          players: ['jeb_', 'Notch'],
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
        params: { player: 'notch' },
        result: {
          status: 'player_removed',
        },
      },
      {
        id: 'whitelistRemove',
        params: { player: 'notch' },
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
