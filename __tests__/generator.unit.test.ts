import path from 'path';
import os from 'os';
import fs from 'fs';
import { generateOpenAPIDocument } from '../src/generator/generator';

describe('generateOpenAPIDocument', () => {
  it('generates schemas, paths and attaches examples for responses', async () => {
    const attributes = {
      id: { type: 'UUID', allowNull: false, defaultValue: null, comment: 'primary id', primaryKey: true },
      name: { type: 'VARCHAR(255)', allowNull: false, defaultValue: null, comment: 'name' },
      email: { type: 'VARCHAR(255)', allowNull: true, defaultValue: null },
      count: { type: 'INT', allowNull: false, defaultValue: 0 },
      price: { type: 'DECIMAL', allowNull: true, defaultValue: null },
      isActive: { type: 'BOOLEAN', allowNull: false, defaultValue: true },
      preferences: { type: 'JSON', allowNull: true, defaultValue: null },
      tags: { type: 'ARRAY', allowNull: true, defaultValue: null },
      status: { type: "ENUM('pending','active')", allowNull: false, defaultValue: 'pending' },
    } as any;

    const mockQueryInterface = {
      showAllTables: jest.fn().mockResolvedValue(['users']),
      describeTable: jest.fn().mockResolvedValue(attributes),
    };

    const mockSequelize: any = {
      authenticate: jest.fn().mockResolvedValue(undefined),
      getQueryInterface: jest.fn().mockReturnValue(mockQueryInterface),
      close: jest.fn().mockResolvedValue(undefined),
    };

    const outFile = path.join(os.tmpdir(), `openapi-test-${Date.now()}.json`);

    await generateOpenAPIDocument(mockSequelize, outFile, true, 'names');

    // file should have been written
    const raw = fs.readFileSync(outFile, 'utf8');
    const doc = JSON.parse(raw);

    // components and schema
    expect(doc.components).toBeDefined();
    expect(doc.components.schemas).toBeDefined();
    // model name 'users' -> schema key 'Users'
    expect(doc.components.schemas.Users).toBeDefined();
    const usersSchema = doc.components.schemas.Users as any;

    // schema example populated when includeExamples=true
    expect(usersSchema.example).toBeDefined();
    expect(usersSchema.example.id).toBe('123e4567-e89b-12d3-a456-426614174000');
    // name should use 'names' theme -> 'Alice Example'
    expect(usersSchema.example.name).toBe('Alice Example');
    // enum should pick first value (note: generator upper-cases enum literal values)
    expect(usersSchema.example.status).toBe('PENDING');
    // array example
    expect(usersSchema.example.tags).toEqual(['example']);

    // paths
    expect(doc.paths['/users']).toBeDefined();
    // responses for list should have examples attached
    const list200 = doc.paths['/users'].get.responses['200'];
    expect(list200.content['application/json'].examples).toBeDefined();
    expect(list200.content['application/json'].examples.example.value).toEqual([usersSchema.example]);

    // single item get should have example attached as well
    const item200 = doc.paths['/users/{id}'].get.responses['200'];
    expect(item200.content['application/json'].examples).toBeDefined();
    expect(item200.content['application/json'].examples.example.value).toEqual(usersSchema.example);

    // ensure sequelize.close was called
    expect(mockSequelize.close).toHaveBeenCalled();
  });
});

describe('generator extra branches', () => {
  it('uses default includeExamples parameter when omitted', async () => {
    const mockQueryInterface = { showAllTables: jest.fn().mockResolvedValue([]) };
    const mockSequelize: any = {
      authenticate: jest.fn().mockResolvedValue(undefined),
      getQueryInterface: jest.fn().mockReturnValue(mockQueryInterface),
      close: jest.fn().mockResolvedValue(undefined),
    };

    const outFile = path.join(os.tmpdir(), `openapi-default-param-${Date.now()}.json`);
    // call without the includeExamples argument to hit the default parameter
    await generateOpenAPIDocument(mockSequelize, outFile);
    const raw = fs.readFileSync(outFile, 'utf8');
    const doc = JSON.parse(raw);
    expect(doc.openapi).toBe('3.0.0');
    expect(mockSequelize.close).toHaveBeenCalled();
  });

  it('sets readOnly for array attribute when primaryKey is true', async () => {
    const attrs = {
      tags: { type: 'ARRAY', allowNull: false, primaryKey: true },
    } as any;
    const qi = {
      showAllTables: jest.fn().mockResolvedValue(['things']),
      describeTable: jest.fn().mockResolvedValue(attrs),
    };
    const seq: any = {
      authenticate: jest.fn().mockResolvedValue(undefined),
      getQueryInterface: jest.fn().mockReturnValue(qi),
      close: jest.fn().mockResolvedValue(undefined),
    };
    const outFile = path.join(os.tmpdir(), `openapi-array-pk-${Date.now()}.json`);
    await generateOpenAPIDocument(seq, outFile, false);
    const doc = JSON.parse(fs.readFileSync(outFile, 'utf8'));
    const schema = doc.components.schemas.Things;
    expect(schema).toBeDefined();
    // array property should have readOnly true when attribute.primaryKey is true
    expect(schema.properties.tags.readOnly).toBe(true);
    expect(seq.close).toHaveBeenCalled();
  });

  it('maps ENUM types to schema.enum array', async () => {
    const attrs = {
      status: { type: "ENUM('one','two')", allowNull: false },
    } as any;
    const qi = {
      showAllTables: jest.fn().mockResolvedValue(['widgets']),
      describeTable: jest.fn().mockResolvedValue(attrs),
    };
    const seq: any = {
      authenticate: jest.fn().mockResolvedValue(undefined),
      getQueryInterface: jest.fn().mockReturnValue(qi),
      close: jest.fn().mockResolvedValue(undefined),
    };
    const outFile = path.join(os.tmpdir(), `openapi-enum-${Date.now()}.json`);
    await generateOpenAPIDocument(seq, outFile, false);
    const doc = JSON.parse(fs.readFileSync(outFile, 'utf8'));
    const enumVals = doc.components.schemas.Widgets.properties.status.enum;
    expect(enumVals).toEqual(['one', 'two']);
  });

  it('leaves schema.enum undefined when attribute type is not ENUM', async () => {
    const attrs = {
      description: { type: 'VARCHAR(255)', allowNull: true },
    } as any;
    const qi = {
      showAllTables: jest.fn().mockResolvedValue(['things2']),
      describeTable: jest.fn().mockResolvedValue(attrs),
    };
    const seq: any = {
      authenticate: jest.fn().mockResolvedValue(undefined),
      getQueryInterface: jest.fn().mockReturnValue(qi),
      close: jest.fn().mockResolvedValue(undefined),
    };
    const outFile = path.join(os.tmpdir(), `openapi-no-enum-${Date.now()}.json`);
    await generateOpenAPIDocument(seq, outFile, false);
    const doc = JSON.parse(fs.readFileSync(outFile, 'utf8'));
    expect(doc.components.schemas.Things2.properties.description.enum).toBeUndefined();
  });

  it('handles ENUM types with no quoted values (match returns null) producing empty enum array', async () => {
    const attrs = {
      odd: { type: 'ENUM()', allowNull: false },
    } as any;
    const qi = {
      showAllTables: jest.fn().mockResolvedValue(['odds']),
      describeTable: jest.fn().mockResolvedValue(attrs),
    };
    const seq: any = {
      authenticate: jest.fn().mockResolvedValue(undefined),
      getQueryInterface: jest.fn().mockReturnValue(qi),
      close: jest.fn().mockResolvedValue(undefined),
    };
    const outFile = path.join(os.tmpdir(), `openapi-empty-enum-${Date.now()}.json`);
    await generateOpenAPIDocument(seq, outFile, false);
    const doc = JSON.parse(fs.readFileSync(outFile, 'utf8'));
    const enumVals = doc.components.schemas.Odds.properties.odd.enum;
    expect(Array.isArray(enumVals)).toBe(true);
    expect(enumVals.length).toBe(0);
  });
});
