import { generateExampleForAttribute, attachResponseExamples } from '../src/generator/responseExamples';
import { OpenAPIV3_1 } from 'openapi-types';

describe('responseExamples utilities', () => {
  test('generateExampleForAttribute handles enums, uuid, numbers, json, arrays and themes', () => {
    // generateExampleForAttribute uppercases the type string internally, so enum values will be uppercased
    const { Theme } = require('../src/constants');
    expect(generateExampleForAttribute('color', { type: "ENUM('red','green')" }, Theme.Lorem)).toBe('RED');
    expect(generateExampleForAttribute('id', { type: 'INT' }, 'lorem')).toBe(1);
    expect(generateExampleForAttribute('price', { type: 'DECIMAL' }, 'lorem')).toBe(1.23);
    expect(generateExampleForAttribute('data', { type: 'JSON' }, 'lorem')).toEqual({ sample: true });
    expect(generateExampleForAttribute('tags', { type: 'TEXT ARRAY' }, 'lorem')).toEqual(['example']);
    expect(generateExampleForAttribute('uuid', { type: 'UUID' }, 'lorem')).toMatch(/^[0-9a-f\-]{36}$/i);
    // names/theme
    expect(generateExampleForAttribute('full_name', { type: 'VARCHAR' }, Theme.Names)).toBe('Alice Example');
    expect(generateExampleForAttribute('product_name', { type: 'VARCHAR' }, Theme.Tech)).toBe('Acme Product');
    expect(generateExampleForAttribute('bio', { type: 'TEXT' }, Theme.Lorem)).toBe('Lorem ipsum dolor sit amet');
  });

  test('attachResponseExamples attaches examples for array refs, single refs and ErrorResponse', () => {
    const doc: OpenAPIV3_1.Document = {
      openapi: '3.0.0',
      info: { title: 't', version: '1' },
      paths: {
        '/foos': {
          get: {
            responses: {
              '200': {
                description: 'list',
                content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Foo' } } } }
              }
            }
          }
        },
        '/foo/{id}': {
          get: {
            responses: {
              '200': {
                description: 'single',
                content: { 'application/json': { schema: { $ref: '#/components/schemas/Foo' } } }
              }
            }
          }
        },
        '/boom': {
          get: {
            responses: {
              '500': {
                description: 'err',
                content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
              }
            }
          }
        }
      },
      components: { schemas: {
        Foo: { type: 'object', properties: { id: { type: 'integer' } }, example: { id: 1 } },
        ErrorResponse: { type: 'object', properties: { code: { type: 'integer' }, message: { type: 'string' } }, example: { code: 500, message: 'err' } }
      } }
    } as any;

    attachResponseExamples(doc);

    const arrExamples = ((doc as any).paths['/foos'].get.responses['200'] as any).content['application/json'].examples;
    const singleExamples = ((doc as any).paths['/foo/{id}'].get.responses['200'] as any).content['application/json'].examples;
    const errExamples = ((doc as any).paths['/boom'].get.responses['500'] as any).content['application/json'].examples;

    expect(arrExamples).toBeDefined();
    expect(Array.isArray(arrExamples.example.value)).toBeTruthy();
    expect(singleExamples).toBeDefined();
    expect(singleExamples.example.value.id).toBe(1);
    expect(errExamples).toBeDefined();
    // attachResponseExamples may attach ErrorResponse under 'example' or 'error' depending on matching order
    const errVal = errExamples.example?.value ?? errExamples.error?.value;
    expect(errVal).toBeDefined();
    expect(errVal.code).toBe(500);
  });

  test('ErrorResponse branch runs even when component example is missing', () => {
    const doc: OpenAPIV3_1.Document = {
      openapi: '3.0.0',
      info: { title: 't', version: '1' },
      paths: {
        '/boom2': {
          get: {
            responses: {
              '500': {
                description: 'err',
                content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
              }
            }
          }
        }
      },
      components: { schemas: {
        // ErrorResponse exists but intentionally lacks 'example' so the specific branch is exercised
        ErrorResponse: { type: 'object', properties: { code: { type: 'integer' }, message: { type: 'string' } } }
      } }
    } as any;

    attachResponseExamples(doc);
    const errExamples = ((doc as any).paths['/boom2'].get.responses['500'] as any).content['application/json'].examples;
    expect(errExamples).toBeDefined();
    // value may be undefined (component example missing) but branch executed
    expect(errExamples.error).toBeDefined();
  });

  test('generateExampleForAttribute covers date/time and name/url/phone/theme branches', () => {
    // TIME + DATE combined
    expect(typeof generateExampleForAttribute('ts', { type: 'TIME DATE' }, 'lorem')).toBe('string');
    // DATETIME / TIMESTAMP
    expect(typeof generateExampleForAttribute('ts2', { type: 'TIMESTAMP' }, 'lorem')).toBe('string');
    expect(typeof generateExampleForAttribute('dt', { type: 'DATETIME' }, 'lorem')).toBe('string');
    // DATE only
    expect(generateExampleForAttribute('d', { type: 'DATE' }, 'lorem')).toMatch(/\d{4}-\d{2}-\d{2}/);
    // TIME only
    expect(generateExampleForAttribute('t', { type: 'TIME' }, 'lorem')).toBe('12:34:56');

    // attribute.type missing -> fallback to name-based detectors
    expect(generateExampleForAttribute('website_url', {}, 'lorem')).toBe('https://example.com');
    expect(generateExampleForAttribute('contact_phone', {}, 'lorem')).toBe('+1-555-555-5555');

    // name handling with themes
    expect(generateExampleForAttribute('full_name', { type: '' }, 'names')).toBe('Alice Example');
    expect(generateExampleForAttribute('product_name', { type: '' }, 'tech')).toBe('Acme Product');
    expect(generateExampleForAttribute('person_name', { type: '' }, 'lorem')).toBe('John Doe');

    // theme-level text handlers
    expect(generateExampleForAttribute('note', { type: '' }, 'names')).toBe('Alice');
    expect(generateExampleForAttribute('note', { type: '' }, 'tech')).toBe('example-tech-string');
    expect(generateExampleForAttribute('note', { type: '' }, 'lorem')).toBe('Lorem ipsum dolor sit amet');
  });

  test('generateExampleForAttribute handles ENUM with no quoted values gracefully', () => {
    // attribute.type contains 'ENUM' but no quoted values -> match returns null
    const res = generateExampleForAttribute('flag', { type: 'ENUM()' }, 'lorem');
    // falls through to name-based or theme-based defaults; since name doesn't match, expect theme default
    expect(res).toBe('Lorem ipsum dolor sit amet');
  });

  test('attachResponseExamples skips operations without responses', () => {
    const doc: any = {
      openapi: '3.0.0',
      info: { title: 't', version: '1' },
      paths: {
        '/empty': {
          get: {
            // op exists but no 'responses' key -> should be continued over
          }
        }
      },
      components: { schemas: {} }
    };

    // Should not throw
    expect(() => attachResponseExamples(doc)).not.toThrow();
  });

  test('ENUM with no quoted values falls back to default', () => {
    // rawType includes ENUM but no quoted values -> match returns null -> should fall back
    const val = generateExampleForAttribute('color', { type: 'ENUM()' }, 'lorem');
    expect(val).toBe('Lorem ipsum dolor sit amet');
  });

  test('attachResponseExamples skips operations without responses', () => {
    const doc: any = {
      openapi: '3.0.0',
      info: { title: 't', version: '1' },
      paths: {
        '/test': {
          get: null,
          post: {}
        }
      },
      components: { schemas: {} }
    };

    // Should not throw
    attachResponseExamples(doc);
    // ensure function didn't add any examples
    expect((doc.paths['/test'].post as any).responses).toBeUndefined();
  });
});
