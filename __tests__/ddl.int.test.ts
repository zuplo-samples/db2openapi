import { initializeSequelizeFromDDL, generateOpenAPIDocument } from '../src/generator/generator';
import { readFileSync, unlinkSync, existsSync } from 'fs';

describe('DDL-based OpenAPI generation (integration)', () => {
  it('generates OpenAPI from schema.sql and includes expected schemas', async () => {
    const ddlPath = './schema.sql';
    const out = './openapi-from-ddl.test.json';
    const sequelize = await initializeSequelizeFromDDL(ddlPath);
    const { Theme } = require('../src/constants');
    await generateOpenAPIDocument(sequelize, out, true, Theme.Lorem);

    expect(existsSync(out)).toBe(true);
    const doc = JSON.parse(readFileSync(out, 'utf8'));
    expect(doc.components).toBeDefined();
    expect(doc.components.schemas).toBeDefined();
    expect(doc.components.schemas['Categories']).toBeDefined();
    expect(doc.components.schemas['Products']).toBeDefined();

    // cleanup
    try { unlinkSync(out); } catch (e) { /* ignore */ }
  }, 20000);
});
