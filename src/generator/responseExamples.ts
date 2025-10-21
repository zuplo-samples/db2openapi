import { OpenAPIV3_1 } from 'openapi-types';

import { Theme, DEFAULT_THEME, SqlType } from '../constants';

export const generateExampleForAttribute = (
  attributeName: string,
  attribute: any,
  theme: Theme | string = DEFAULT_THEME
) => {
  const rawType = (attribute.type || '').toUpperCase();
  // Prefer enum values if present
  if (rawType.includes(SqlType.ENUM)) {
    const matches = rawType.match(/'([^']+)'/g) ?? [];
    if (matches.length > 0) return matches[0].slice(1, -1);
  }
  if (rawType.includes(SqlType.UUID)) return '123e4567-e89b-12d3-a456-426614174000';
  if (rawType.includes(SqlType.INT) || rawType.includes(SqlType.SERIAL) || rawType.includes(SqlType.BIGINT)) return 1;
  if (rawType.includes(SqlType.FLOAT) || rawType.includes(SqlType.DOUBLE) || rawType.includes(SqlType.DECIMAL) || rawType.includes(SqlType.REAL)) return 1.23;
  if (rawType.includes(SqlType.BOOLEAN)) return true;
  if (rawType.includes(SqlType.JSON)) return { sample: true };
  if (rawType.includes(SqlType.ARRAY)) return ['example'];
  if (rawType.includes(SqlType.TIME) && rawType.includes(SqlType.DATE)) return new Date().toISOString();
  if (rawType.includes(SqlType.DATETIME) || rawType.includes(SqlType.TIMESTAMP)) return new Date().toISOString();
  if (rawType.includes(SqlType.DATE) && !rawType.includes(SqlType.TIME)) return new Date().toISOString().split('T')[0];
  if (rawType.includes(SqlType.TIME) && !rawType.includes(SqlType.DATE)) return '12:34:56';

  const lowerName = attributeName.toLowerCase();
  if (lowerName.includes('email')) return 'user@example.com';
  if (lowerName.includes('url') || lowerName.includes('uri') || lowerName.includes('link')) return 'https://example.com';
  if (lowerName.includes('phone') || lowerName.includes('tel')) return '+1-555-555-5555';
  if (lowerName.includes('name')) {
    if (theme === Theme.Names) return 'Alice Example';
    return theme === Theme.Tech ? 'Acme Product' : 'John Doe';
  }

  // Generic text handling by theme
  if (theme === Theme.Names) return 'Alice';
  if (theme === Theme.Tech) return 'example-tech-string';
  // default: lorem
  return 'Lorem ipsum dolor sit amet';
};

export const attachResponseExamples = (openApiDocument: OpenAPIV3_1.Document) => {
  for (const pathKey of Object.keys(openApiDocument.paths!)) {
    const pathItem: any = openApiDocument.paths![pathKey] as any;
    for (const method of Object.keys(pathItem)) {
      const op = pathItem[method];
      if (!op || !op.responses) continue;
      for (const [status, resp] of Object.entries(op.responses)) {
        const r: any = resp as any;
        if (!r.content || !r.content['application/json']) continue;
        const schema = r.content['application/json'].schema;
        // Special-case ErrorResponse so it can be attached even when other $ref
        // handling would short-circuit. This ensures a consistent example key
        // for error responses.
        if (r.content['application/json'].schema && r.content['application/json'].schema.$ref === '#/components/schemas/ErrorResponse') {
          r.content['application/json'].examples = { error: { value: openApiDocument.components!.schemas!['ErrorResponse'].example } };
        }

        if (schema && schema.type === 'array' && schema.items && schema.items.$ref) {
          const ref = schema.items.$ref as string;
          const compName = ref.split('/').pop()!;
          const comp = openApiDocument.components!.schemas![compName] as any;
          if (comp && comp.example) {
            r.content['application/json'].examples = { example: { value: [comp.example] } };
          }
        } else if (schema && schema.$ref) {
          const ref = schema.$ref as string;
          const compName = ref.split('/').pop()!;
          const comp = openApiDocument.components!.schemas![compName] as any;
          if (comp && comp.example) {
            r.content['application/json'].examples = { example: { value: comp.example } };
          }
        }
      }
    }
  }
};
