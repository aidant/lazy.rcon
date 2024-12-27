import type { RconClient } from './create-rcon-client.js'

export type ConstDefinition = { const: unknown }
export type StringDefinition = { type: 'string' }
export type NumberDefinition = { type: 'number' }
export type ArrayDefinition = { type: 'array'; items: TypeDefinition }
export type TypeDefinition = ConstDefinition | StringDefinition | NumberDefinition | ArrayDefinition

export type InferTypeFromDefinition<T extends TypeDefinition> = T extends { const: infer Const }
  ? Const
  : T extends { type: 'string' }
  ? string
  : T extends { type: 'number' }
  ? number
  : T extends { type: 'array'; items: infer Items }
  ? Items extends TypeDefinition
    ? Array<InferTypeFromDefinition<Items>>
    : never
  : never

export type Command = {
  request: {
    body: string
    params?: Record<string | number | symbol, TypeDefinition>
  }
  response: {
    body: string
    params?: Record<string | number | symbol, TypeDefinition>
  }[]
}
export type Commands = { [CommandId in string]: Command }

export type InferCommandRequest<TCommand extends Command> =
  TCommand['request']['params'] extends undefined
    ? never
    : {
        [ParamName in keyof TCommand['request']['params']]: InferTypeFromDefinition<
          Exclude<TCommand['request']['params'], undefined>[ParamName]
        >
      }

export type InferCommandResponse<TCommand extends Command> = {
  [K in keyof TCommand['response']]: TCommand['response'][K] extends { params?: infer Params }
    ? {
        [ParamName in keyof Params]: Params[ParamName] extends TypeDefinition
          ? InferTypeFromDefinition<Params[ParamName]>
          : never
      }
    : never
}[number]

export type GameClient<TCommands extends Commands> = Simplify<{
  [CommandId in keyof TCommands]: (
    options: InferCommandRequest<TCommands[CommandId]>,
  ) => Promise<InferCommandResponse<TCommands[CommandId]>>
}>

export type Simplify<T> = { [K in keyof T]: T[K] } & {}

export const createRequest = (command: Command, options: Record<PropertyKey, unknown>) => {
  return command.request.body.replace(/\{.+?\}/g, (match) =>
    String(options[match.substring(1, match.length - 1)]),
  )
}

export const createResultFromTypeDefinition = (
  raw: string,
  definition: TypeDefinition,
): unknown => {
  if ('const' in definition) {
    return definition.const
  } else if (definition.type === 'string') {
    return raw.trim()
  } else if (definition.type === 'number') {
    return Number(raw)
  } else if (definition.type === 'array') {
    if (!raw) {
      return []
    } else {
      return raw.split(',').map((item) => createResultFromTypeDefinition(item, definition.items))
    }
  }

  return
}

export const createResponse = (command: Command, response: string) => {
  for (const schema of command.response) {
    const regex = new RegExp(
      `^${schema.body
        .split(/(\{.+?\})/g)
        .map((value) =>
          value.startsWith('{') && value.endsWith('}')
            ? value.replace(
                /\{.+?\}/g,
                (match) => `(?<${match.substring(1, match.length - 1)}>.*?)`,
              )
            : value.replace(/[\.\*\+\?\^\$\{\}\(\)\|\[\]\\]/g, '\\$&'),
        )
        .join('')}$`,
    )

    const match = regex.exec(response)

    if (!match) {
      continue
    }

    if (!schema.params) {
      return
    }

    const result: Record<PropertyKey, unknown> = {}

    for (const [property, definition] of Object.entries(schema.params)) {
      result[property] = createResultFromTypeDefinition(match?.groups?.[property] || '', definition)
    }

    return result
  }

  return
}

export const createGameClient = <TCommands extends Commands>(
  rcon: RconClient,
  commands: TCommands,
): GameClient<TCommands> => {
  return Object.fromEntries(
    Object.entries(commands).map(([property, command]) => [
      property,
      async (options: Record<PropertyKey, unknown>) => {
        return createResponse(command, await rcon.exec(createRequest(command, options)))
      },
    ]),
  ) as unknown as GameClient<TCommands>
}
