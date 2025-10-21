import { generateOpenAPIDocument, generateExampleForAttribute } from '../index';
import { Sequelize } from 'sequelize';
import { writeFileSync } from 'fs';

jest.mock('fs', () => ({ writeFileSync: jest.fn() }));

describe('OpenAPI generator responseExamples (integration)', () => {
  it('generates schema examples and response examples when --examples is true', async () => {
    // Mock sequelize instance with minimal interface used by the generator
    const sequelize: any = {
      authenticate: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
      getQueryInterface: () => ({
        showAllTables: jest.fn().mockResolvedValue(['users']),
        describeTable: jest.fn().mockResolvedValue({
          id: { type: 'INT', allowNull: false, primaryKey: true },
          name: { type: 'VARCHAR', allowNull: false },
          email: { type: 'VARCHAR', allowNull: true },
          created_at: { type: 'DATETIME', allowNull: false }
        })
      })
    } as unknown as Sequelize;

    // Run generator with examples enabled and capture written JSON
    await generateOpenAPIDocument(sequelize as any, '/tmp/openapi-test.json', true, 'names');

    // verify fs.writeFileSync was called and produced JSON
    expect(writeFileSync).toHaveBeenCalled();
    const callArgs: any = (writeFileSync as jest.Mock).mock.calls[0];
    const jsonOut = JSON.parse(callArgs[1]);

    // Components should exist
    expect(jsonOut.components).toBeDefined();
    expect(jsonOut.components.schemas).toBeDefined();
    // User schema should exist
    const userSchema = jsonOut.components.schemas.Users || jsonOut.components.schemas.Users;
    expect(userSchema).toBeDefined();
    // Schema should have example
    expect(userSchema.example).toBeDefined();
    expect(userSchema.example.name).toBe('Alice Example');
    expect(userSchema.example.email).toBe('user@example.com');
    expect(userSchema.example.created_at).toMatch(/\d{4}-\d{2}-\d{2}T/);

    // Responses should include examples
    const paths = jsonOut.paths;
    expect(Object.keys(paths).length).toBeGreaterThan(0);
    const listGet = paths['/users'].get;
    expect(listGet.responses['200'].content['application/json'].examples).toBeDefined();
  });

  it('generateExampleForAttribute returns proper types', () => {
    const { Theme } = require('../src/constants');
    expect(generateExampleForAttribute('email', { type: 'VARCHAR' }, Theme.Lorem)).toBe('user@example.com');
    expect(generateExampleForAttribute('id', { type: 'INT' }, Theme.Lorem)).toBe(1);
    expect(generateExampleForAttribute('price', { type: 'DECIMAL' }, Theme.Lorem)).toBe(1.23);
    expect(generateExampleForAttribute('flag', { type: 'BOOLEAN' }, Theme.Lorem)).toBe(true);
    expect(generateExampleForAttribute('birthdate', { type: 'DATE' }, 'lorem')).toMatch(/\d{4}-\d{2}-\d{2}/);
  });
});
