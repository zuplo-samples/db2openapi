export enum DbDialect {
  Postgres = 'postgres',
  Mysql = 'mysql',
  MariaDB = 'mariadb',
  Mssql = 'mssql',
  Sqlite = 'sqlite',
  Oracle = 'oracle',
}

export enum Theme {
  Lorem = 'lorem',
  Names = 'names',
  Tech = 'tech',
}

export const DEFAULT_THEME = Theme.Lorem;

export const SQLITE_STORAGE = ':memory:';
export const SQLITE_DIALECT = DbDialect.Sqlite;

// Common SQL type name tokens used in DDL/type strings. These are intended to be
// compared against a normalized (uppercase) type string produced by Sequelize
// describeType results.
export enum SqlType {
  INT = 'INT',
  BIGINT = 'BIGINT',
  SERIAL = 'SERIAL',
  FLOAT = 'FLOAT',
  DOUBLE = 'DOUBLE',
  DECIMAL = 'DECIMAL',
  REAL = 'REAL',
  CHAR = 'CHAR',
  TEXT = 'TEXT',
  DATE = 'DATE',
  DATETIME = 'DATETIME',
  TIMESTAMP = 'TIMESTAMP',
  TIME = 'TIME',
  STRING = 'STRING',
  CLOB = 'CLOB',
  BOOLEAN = 'BOOLEAN',
  JSON = 'JSON',
  ARRAY = 'ARRAY',
  UUID = 'UUID',
  ENUM = 'ENUM',
}
