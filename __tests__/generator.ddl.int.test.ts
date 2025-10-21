import fs from 'fs';
import path from 'path';
import os from 'os';
import { initializeSequelizeFromDDL } from '../src/generator/generator';

describe('initializeSequelizeFromDDL (integration)', () => {
  it('applies DDL to an in-memory sqlite and returns sequelize', async () => {
    const ddl = `
CREATE TABLE widgets (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE orders (
  id INTEGER PRIMARY KEY,
  widget_id INTEGER,
  quantity INTEGER
);
`;

    const tmp = path.join(os.tmpdir(), `ddl-${Date.now()}.sql`);
    fs.writeFileSync(tmp, ddl, 'utf8');

    const sequelize: any = await initializeSequelizeFromDDL(tmp);
    // showAllTables should include our created tables
    const tables = await sequelize.getQueryInterface().showAllTables();
    expect(Array.isArray(tables)).toBe(true);
    // Normalize to strings and lowercase for sqlite variations
    const names = tables.map((t: any) => String(t).toLowerCase());
    expect(names).toEqual(expect.arrayContaining(['widgets', 'orders']));

    await sequelize.close();
    // cleanup
    fs.unlinkSync(tmp);
  });

  it('closes and rethrows when applying invalid DDL', async () => {
    const bad = `CREATE TABLE bad ( id INTEGER PRIMARY KEY name TEXT );`;
    const tmp = path.join(os.tmpdir(), `ddl-bad-${Date.now()}.sql`);
    fs.writeFileSync(tmp, bad, 'utf8');

    await expect(initializeSequelizeFromDDL(tmp)).rejects.toThrow();

    // cleanup
    fs.unlinkSync(tmp);
  });
});
