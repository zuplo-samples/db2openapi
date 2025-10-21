import { readFileSync } from 'fs';
import { Sequelize } from 'sequelize';
import { SQLITE_DIALECT, SQLITE_STORAGE } from '../constants';
import { splitSqlStatements } from './sqlSplitter';

export async function initializeSequelizeFromDDL(ddlPath: string, createSequelize?: (opts: any) => any) {
  const ddl = readFileSync(ddlPath, 'utf-8');
  const statements = splitSqlStatements(ddl);

  const sequelize = createSequelize
    ? createSequelize({ dialect: SQLITE_DIALECT, storage: SQLITE_STORAGE })
    : new Sequelize({ dialect: SQLITE_DIALECT, storage: SQLITE_STORAGE, logging: false });

  try {
    // PRAGMA to enforce foreign keys etc
    await sequelize.query('PRAGMA foreign_keys = ON;');
    for (const stmt of statements) {
      await sequelize.query(stmt);
    }
  } catch (err) {
    try {
      await sequelize.close();
    } catch (e) {
      // ignore
    }
    throw err;
  }
  return sequelize;
}
