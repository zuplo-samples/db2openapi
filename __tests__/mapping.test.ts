import { mapSequelizeTypeToOpenAPIType, mapSequelizeTypeToFormat } from '../src/generator/mapping';

describe('mapping utilities', () => {
  test('mapSequelizeTypeToOpenAPIType covers common branches', () => {
    expect(mapSequelizeTypeToOpenAPIType('INT')).toBe('integer');
    expect(mapSequelizeTypeToOpenAPIType('DECIMAL')).toBe('number');
    expect(mapSequelizeTypeToOpenAPIType('VARCHAR')).toBe('string');
    expect(mapSequelizeTypeToOpenAPIType('BOOLEAN')).toBe('boolean');
    expect(mapSequelizeTypeToOpenAPIType('JSON')).toBe('object');
    // 'TEXT' branch is checked before 'ARRAY' in mapping.ts, so this maps to 'string'
    expect(mapSequelizeTypeToOpenAPIType('TEXT ARRAY')).toBe('string');
    expect(mapSequelizeTypeToOpenAPIType('UNKNOWN_TYPE')).toBe('string');
  });

  test('mapSequelizeTypeToFormat maps formats correctly', () => {
    expect(mapSequelizeTypeToFormat('INT')).toBe('int32');
    expect(mapSequelizeTypeToFormat('FLOAT')).toBe('float');
    expect(mapSequelizeTypeToFormat('DATETIME')).toBe('date-time');
    expect(mapSequelizeTypeToFormat('DATE')).toBe('date');
    expect(mapSequelizeTypeToFormat('TIME')).toBe('time');
    expect(mapSequelizeTypeToFormat('DOUBLE')).toBe('double');
    expect(mapSequelizeTypeToFormat('UUID')).toBe('uuid');
    expect(mapSequelizeTypeToFormat('SOMETHING_ELSE')).toBeUndefined();
  });

  test('array type maps to array and extra format branches', () => {
    // Ensure ARRAY branch (line 28) is covered and default fallback
    // 'TEXT' is checked before 'ARRAY' in mapping.ts, so this maps to 'string'
    expect(mapSequelizeTypeToOpenAPIType('TEXT ARRAY')).toBe('string');
    // Direct ARRAY token (or a non-matching prefix containing ARRAY) should map to 'array'
    expect(mapSequelizeTypeToOpenAPIType('ARRAY')).toBe('array');
    expect(mapSequelizeTypeToOpenAPIType('FOO_ARRAY')).toBe('array');
    expect(mapSequelizeTypeToOpenAPIType('SOMETHING_ELSE')).toBe('string');

    // Additional format branches
    expect(mapSequelizeTypeToFormat('DECIMAL')).toBe('double');
    expect(mapSequelizeTypeToFormat('UNKNOWN')).toBeUndefined();
  });
});
