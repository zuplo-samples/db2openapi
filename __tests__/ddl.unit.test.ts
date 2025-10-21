import path from 'path';
import os from 'os';
import fs from 'fs';
import { initializeSequelizeFromDDL } from '../src/generator/ddl';

describe('initializeSequelizeFromDDL (unit, injectable)', () => {
  it('invokes PRAGMA and executes statements using injected sequelize', async () => {
    const sql = `CREATE TABLE a (id INTEGER);
CREATE TABLE b (id INTEGER);
`;
    const tmp = path.join(os.tmpdir(), `ddl-${Date.now()}.sql`);
    fs.writeFileSync(tmp, sql, 'utf8');

    const calls: string[] = [];
    const fakeSequelize = {
      query: jest.fn().mockImplementation(async (q: string) => { calls.push(q); return undefined; }),
      close: jest.fn().mockResolvedValue(undefined),
    };
    const create = jest.fn().mockReturnValue(fakeSequelize);

    const seq = await initializeSequelizeFromDDL(tmp, create);
    expect(create).toHaveBeenCalled();
    // PRAGMA should be issued first
    expect(calls[0]).toBe('PRAGMA foreign_keys = ON;');
    // statements should include CREATE TABLE a and CREATE TABLE b
    expect(calls.some(c => c.includes('CREATE TABLE a'))).toBe(true);
    expect(calls.some(c => c.includes('CREATE TABLE b'))).toBe(true);
    expect(seq).toBe(fakeSequelize);

    await seq.close();
    fs.unlinkSync(tmp);
  });

  it('closes on error and rethrows when injected sequelize.query fails', async () => {
    const sql = `CREATE TABLE bad (id INTEGER`;
    const tmp = path.join(os.tmpdir(), `ddl-bad-${Date.now()}.sql`);
    fs.writeFileSync(tmp, sql, 'utf8');

    const fakeSequelize = {
      query: jest.fn().mockRejectedValue(new Error('fail')),
      close: jest.fn().mockResolvedValue(undefined),
    };
    const create = jest.fn().mockReturnValue(fakeSequelize);

    await expect(initializeSequelizeFromDDL(tmp, create)).rejects.toThrow();
    expect(fakeSequelize.close).toHaveBeenCalled();
    fs.unlinkSync(tmp);
  });
});
