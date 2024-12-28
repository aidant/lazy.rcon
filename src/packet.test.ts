import { describe, expect, it } from 'vitest'
import { deserializeRconPacket, RconPacketType, serializeRconPacket } from './packet.js'
import { add, hex } from './util-buffer.js'

describe('packet', () => {
  /** @see https://developer.valvesoftware.com/wiki/Source_RCON_Protocol#Example_Packets */
  describe('source rcon protocol examples', () => {
    describe.each([
      {
        name: 'request - auth',
        msg: {
          id: 0,
          type: RconPacketType.Auth,
          body: 'passwrd',
        },
        raw: '110000000000000003000000706173737772640000',
      },
      {
        name: 'response - empty',
        msg: {
          id: 0,
          type: RconPacketType.ResponseValue,
          body: '',
        },
        raw: '0a00000000000000000000000000',
      },
      {
        name: 'response - auth',
        msg: {
          id: 0,
          type: RconPacketType.AuthResponse,
          body: '',
        },
        raw: '0a00000000000000020000000000',
      },
      {
        name: 'request - echo',
        msg: {
          id: 0,
          type: RconPacketType.ExecCommand,
          body: 'echo HLSW: Test',
        },
        raw: '1900000000000000020000006563686f20484c53573a20546573740000',
      },
      {
        name: 'response - echo',
        msg: {
          id: 0,
          type: RconPacketType.ResponseValue,
          body: 'HLSW : Test \n',
        },
        raw: '170000000000000000000000484c5357203a2054657374200a0000',
      },
      {
        name: 'request - log',
        msg: {
          id: 0,
          type: RconPacketType.ExecCommand,
          body: 'log',
        },
        raw: '0d00000000000000020000006c6f670000',
      },
      {
        name: 'response - log',
        msg: {
          id: 0,
          type: RconPacketType.ResponseValue,
          body: 'Usage:  log < on | off >\ncurrently logging to: file, console, udp\n',
        },
        raw: '4c000000000000000000000055736167653a20206c6f67203c206f6e207c206f6666203e0a63757272656e746c79206c6f6767696e6720746f3a2066696c652c20636f6e736f6c652c207564700a0000',
      },
      {
        name: 'request - status',
        msg: {
          id: 0,
          type: RconPacketType.ExecCommand,
          body: 'status',
        },
        raw: '1000000000000000020000007374617475730000',
      },
      {
        name: 'response - status',
        msg: {
          id: 0,
          type: RconPacketType.ResponseValue,
          body: 'hostname: Taskforceranger.net TF2 - Teamwork!\nversion : 1.0.1.4/14 3345 secure \nudp/ip  :  8.2.0.28:27015\nmap     : tc_hydro at: 0 x, 0 y, 0 z\nplayers : 0 (20 max)\n\n# userid name uniqueid connected ping loss state adr\n',
        },
        raw: 'e40000000000000000000000686f73746e616d653a205461736b666f72636572616e6765722e6e657420544632202d205465616d776f726b210a76657273696f6e203a20312e302e312e342f3134203333343520736563757265200a7564702f697020203a2020382e322e302e32383a32373031350a6d617020202020203a2074635f687964726f2061743a203020782c203020792c2030207a0a706c6179657273203a203020283230206d6178290a0a2320757365726964206e616d6520756e69717565696420636f6e6e65637465642070696e67206c6f7373207374617465206164720a0000',
      },
    ])('$name', ({ msg, raw }) => {
      it('serialize', () => {
        expect(serializeRconPacket(msg)).toEqual(hex(raw))
      })
      it('deserialize', () => {
        expect(deserializeRconPacket(hex(raw))).toEqual([msg, null])
      })
    })
  })

  describe('implementation details', () => {
    it('deserialization handles chunked data', () => {
      const chunk1 = hex('12000000000000000300000070617373')
      const chunk2 = hex('776f72640000')

      expect(deserializeRconPacket(chunk1)).toEqual([null, chunk1])
      expect(deserializeRconPacket(add(chunk1, chunk2))).toEqual([
        {
          id: 0,
          type: RconPacketType.Auth,
          body: 'password',
        },
        null,
      ])
    })

    it('deserialization handles multiple messages', () => {
      const chunk = hex('12000000000000000300000070617373776f72640000')
      const chunks = add(chunk, chunk)

      expect(deserializeRconPacket(chunks)).toEqual([
        {
          id: 0,
          type: RconPacketType.Auth,
          body: 'password',
        },
        chunk,
      ])
    })
  })
})
