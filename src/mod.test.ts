import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createRconClient, type RconClient } from './mod.js'

describe('rcon', () => {
  describe('minecraft', () => {
    describe('basic commands', () => {
      let mc: RconClient
      beforeAll(async () => {
        mc = await createRconClient({ host: 'localhost', port: 25575, pass: 'password' })
      })
      afterAll(() => {
        mc.close()
      })

      it.each([
        // 3392
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
        await expect(mc.exec(input!)).resolves.toEqual(output)
      })
    })

    describe('invalid credentials', () => {
      it('throws on invalid credentials', async () => {
        await expect(
          createRconClient({ host: 'localhost', port: 25575, pass: 'no' }),
        ).rejects.toThrowError()
      })
    })
  })
})
