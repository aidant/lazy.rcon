import { describe, expect, it } from 'vitest'
import { createRequest, createResponse, type Command } from './create-game-client.js'

describe('game client', () => {
  describe('handles strings', () => {
    const command = {
      request: { body: 'echo {greeting}', params: { greeting: { type: 'string' } } },
      response: [{ body: '{greeting}', params: { greeting: { type: 'string' } } }],
    } as const satisfies Command

    it('create request', () => {
      expect(createRequest(command, { greeting: 'hello world' })).toEqual('echo hello world')
    })
    it('creates responses', () => {
      expect(createResponse(command, 'hello world')).toEqual({ greeting: 'hello world' })
    })
  })

  describe('handles numbers', () => {
    const command = {
      request: { body: 'echo {greeting}', params: { greeting: { type: 'number' } } },
      response: [{ body: '{greeting}', params: { greeting: { type: 'number' } } }],
    } as const satisfies Command

    it('create request', () => {
      expect(createRequest(command, { greeting: 0x8badf00d })).toEqual('echo 2343432205')
    })
    it('creates responses', () => {
      expect(createResponse(command, '2343432205')).toEqual({ greeting: 0x8badf00d })
    })
  })
})
