export const domainModelSchema = {
  $id: 'https://schemas.compilacion.dev/domain-model.schema.json',
  type: 'object',
  required: ['meta', 'entities'],
  additionalProperties: true,
  properties: {
    meta: {
      type: 'object',
      required: ['domain', 'version'],
      additionalProperties: true,
      properties: {
        domain: { type: 'string', minLength: 1 },
        version: {
          type: 'string',
          pattern: '^\\d+\\.\\d+\\.\\d+$',
        },
        description: { type: 'string', minLength: 1 },
      },
    },
    entities: {
      type: 'object',
      minProperties: 1,
      additionalProperties: {
        type: 'object',
        additionalProperties: true,
        properties: {
          description: { type: 'string' },
          identifiers: {
            type: 'object',
            minProperties: 1,
            additionalProperties: {
              type: 'object',
              required: ['type'],
              additionalProperties: true,
              properties: {
                type: { type: 'string', minLength: 1 },
                required: { type: 'boolean' },
                description: { type: 'string' },
              },
            },
          },
          adjectives: {
            type: 'object',
            additionalProperties: {
              type: 'object',
              required: ['description'],
              additionalProperties: true,
              properties: {
                description: { type: 'string', minLength: 1 },
                mutuallyExclusiveWith: {
                  type: 'array',
                  items: { type: 'string', minLength: 1 },
                },
              },
            },
          },
          actions: {
            type: 'object',
            additionalProperties: {
              type: 'object',
              additionalProperties: true,
              properties: {
                performedBy: {
                  type: 'array',
                  items: { type: 'string', minLength: 1 },
                },
                requiredContext: {
                  type: 'array',
                  items: { type: 'string', minLength: 1 },
                },
                optionalContext: {
                  type: 'array',
                  items: { type: 'string', minLength: 1 },
                },
                references: {
                  type: 'array',
                  items: {
                    type: 'object',
                    required: ['type', 'target', 'cardinality'],
                    additionalProperties: true,
                    properties: {
                      type: { 
                        type: 'string', 
                      },
                      target: { type: 'string', minLength: 1 },
                      cardinality: { 
                        type: 'string', 
                        enum: ['one', 'many']
                      },
                      description: { type: 'string', minLength: 1 }
                    },
                  },
                },
                resultingState: {
                  type: 'array',
                  items: { type: 'string', minLength: 1 },
                },
                schema: { type: 'string', minLength: 1 },
              },
            },
          },
          relationships: {
            type: 'array',
            items: {
              type: 'object',
              required: ['type', 'target', 'cardinality'],
              additionalProperties: true,
              properties: {
                type: { type: 'string', minLength: 1 },
                target: { type: 'string', minLength: 1 },
                description: { type: 'string' },
                cardinality: { type: 'string', minLength: 1 },
              },
            },
          },
          collections: {
            type: 'object',
            additionalProperties: {
              type: 'object',
              required: ['entity'],
              additionalProperties: true,
              properties: {
                entity: { type: 'string', minLength: 1 },
                description: { type: 'string' },
              },
            },
          },
        },
        required: ['identifiers'],
      },
    },
    actors: {
      type: 'array'
    },
    contexts: {
      type: 'object',
      additionalProperties: {
        type: 'object',
        required: ['description', 'type'],
        additionalProperties: true,
        properties: {
          description: { type: 'string', minLength: 1 },
          type: { type: 'string', minLength: 1 },
          values: {
            type: 'array',
            items: { type: 'string', minLength: 1 },
          },
        },
      },
    },
    schemas: {
      type: 'object',
      additionalProperties: {
        type: 'object',
        required: ['description'],
        additionalProperties: true,
        properties: {
          description: { type: 'string', minLength: 1 },
          version: { type: 'string', minLength: 1 },
        },
      },
    },
  },
};
