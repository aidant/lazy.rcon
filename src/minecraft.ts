import type { Commands } from './commands.js'

export const minecraft = {
  list: {
    request: {
      body: 'list',
    },
    response: [
      {
        body: 'There are {count} of a max of {max} players online: {players}',
        params: {
          count: {
            type: 'number',
          },
          max: {
            type: 'number',
          },
          players: {
            type: 'array',
            items: {
              type: 'string',
            },
          },
        },
      },
    ],
  },

  whitelistOn: {
    request: {
      body: 'whitelist on',
    },
    response: [
      {
        body: 'Whitelist is now turned on',
        params: {
          status: {
            const: 'whitelist_on',
          },
        },
      },
      {
        body: 'Whitelist is already turned on',
        params: {
          status: {
            const: 'whitelist_already_on',
          },
        },
      },
    ],
  },
  whitelistOff: {
    request: {
      body: 'whitelist off',
    },
    response: [
      {
        body: 'Whitelist is now turned off',
        params: {
          status: {
            const: 'whitelist_off',
          },
        },
      },
      {
        body: 'Whitelist is already turned off',
        params: {
          status: {
            const: 'whitelist_already_off',
          },
        },
      },
    ],
  },
  whitelist: {
    request: {
      body: 'whitelist list',
    },
    response: [
      {
        body: 'There are no whitelisted players',
        params: {
          total: {
            const: 0,
          },
          players: {
            const: [],
          },
        },
      },
      {
        body: 'There are {count} whitelisted player(s): {players}',
        params: {
          count: {
            type: 'number',
          },
          players: {
            type: 'array',
            items: {
              type: 'string',
            },
          },
        },
      },
    ],
  },
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
  whitelistRemove: {
    request: {
      body: 'whitelist remove {player}',
      params: {
        player: {
          type: 'string',
        },
      },
    },
    response: [
      {
        body: 'Removed {player} from the whitelist',
        params: {
          status: {
            const: 'player_removed',
          },
        },
      },
      {
        body: 'Player is not whitelisted',
        params: {
          status: {
            const: 'player_already_removed',
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
  whitelistReload: {
    request: {
      body: 'whitelist reload',
    },
    response: [
      {
        body: 'Reloaded the whitelist',
      },
    ],
  },
} as const satisfies Commands
