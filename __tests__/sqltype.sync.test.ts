import { SqlType } from '../src/constants';
import { mapSequelizeTypeToOpenAPIType, mapSequelizeTypeToFormat } from '../src/generator/mapping';

describe('SqlType enum vs mapping parity', () => {
  const tokens = Object.values(SqlType) as string[];

  test('every SqlType token maps to a sensible OpenAPI type or format', () => {
    tokens.forEach((tok) => {
      // ensure mapping doesn't throw and returns a value
      const openapiType = mapSequelizeTypeToOpenAPIType(tok);
      expect(openapiType).toBeDefined();
      // format may be undefined for many tokens but calling should not throw
      expect(() => mapSequelizeTypeToFormat(tok)).not.toThrow();
    });
  });
});
