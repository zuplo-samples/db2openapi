import path from 'path';
import os from 'os';
import fs from 'fs';
import { initializeSequelize, generateOpenAPIDocument } from '../src/generator/generator';
import { Sequelize } from 'sequelize';

describe('generateOpenAPIDocument branches', () => {
  it('handles sequelize.authenticate rejection and continues', async () => {
    const mockQueryInterface = { showAllTables: jest.fn().mockResolvedValue([]) };
    const mockSequelize: any = {
      authenticate: jest.fn().mockRejectedValue(new Error('auth fail')),
      getQueryInterface: jest.fn().mockReturnValue(mockQueryInterface),
      close: jest.fn().mockResolvedValue(undefined),
    };

    const outFile = path.join(os.tmpdir(), `openapi-auth-fail-${Date.now()}.json`);
    await expect(generateOpenAPIDocument(mockSequelize, outFile, false)).resolves.toBeUndefined();
    expect(mockSequelize.authenticate).toHaveBeenCalled();
    expect(mockSequelize.close).toHaveBeenCalled();
  });

  it('handles singular model names (pluralization branch)', async () => {
    const attributes = {
      id: { type: 'INT', allowNull: false, primaryKey: true },
      title: { type: 'VARCHAR(255)', allowNull: false },
    } as any;

    const mockQueryInterface = {
      showAllTables: jest.fn().mockResolvedValue(['order']),
      describeTable: jest.fn().mockResolvedValue(attributes),
    };

    const mockSequelize: any = {
      authenticate: jest.fn().mockResolvedValue(undefined),
      getQueryInterface: jest.fn().mockReturnValue(mockQueryInterface),
      close: jest.fn().mockResolvedValue(undefined),
    };

    const outFile = path.join(os.tmpdir(), `openapi-order-${Date.now()}.json`);
    await generateOpenAPIDocument(mockSequelize, outFile, false);
    const raw = fs.readFileSync(outFile, 'utf8');
    const doc = JSON.parse(raw);
    // model 'order' should generate /order and /order/{id} paths
    expect(doc.paths['/order']).toBeDefined();
    expect(doc.paths['/order/{id}']).toBeDefined();
    expect(mockSequelize.close).toHaveBeenCalled();
  });

  it('catches errors thrown while converting tables and still closes', async () => {
    const mockQueryInterface = {
      showAllTables: jest.fn().mockRejectedValue(new Error('boom')),
    };
    const mockSequelize: any = {
      authenticate: jest.fn().mockResolvedValue(undefined),
      getQueryInterface: jest.fn().mockReturnValue(mockQueryInterface),
      close: jest.fn().mockResolvedValue(undefined),
    };

    const outFile = path.join(os.tmpdir(), `openapi-err-${Date.now()}.json`);
    // function should not throw; it will catch and return after finally
    await expect(generateOpenAPIDocument(mockSequelize, outFile, false)).resolves.toBeUndefined();
    expect(mockSequelize.close).toHaveBeenCalled();
  });

  it('initializeSequelize returns a Sequelize instance for sqlite and can be closed', async () => {
    const cfg = { database: ':memory:', username: '', password: '', host: '', port: 0, type: 'sqlite' } as any;
    const seq = await initializeSequelize(cfg);
    // basic sanity: it should have authenticate and close methods
    expect(typeof seq.authenticate).toBe('function');
    expect(typeof seq.close).toBe('function');
    await seq.close();
  });
});
