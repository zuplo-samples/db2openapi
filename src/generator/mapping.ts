import { OpenAPIV3_1 } from 'openapi-types';
import { SqlType } from '../constants';

export const mapSequelizeTypeToOpenAPIType = (
  type: string
): OpenAPIV3_1.NonArraySchemaObjectType | OpenAPIV3_1.ArraySchemaObjectType => {
  const t = (type || '').toUpperCase();
  if (t.includes(SqlType.INT) || t.includes(SqlType.BIGINT) || t.includes(SqlType.SERIAL)) {
    return 'integer';
  }
  if (t.includes(SqlType.FLOAT) || t.includes(SqlType.DOUBLE) || t.includes(SqlType.DECIMAL) || t.includes(SqlType.REAL)) {
    return 'number';
  }
  if (t.includes(SqlType.CHAR) || t.includes(SqlType.TEXT) || t.includes(SqlType.DATE) || t.includes(SqlType.STRING) || t.includes(SqlType.CLOB) || t.includes(SqlType.DATETIME) || t.includes(SqlType.TIMESTAMP)) {
    return 'string';
  }
  if (t.includes(SqlType.BOOLEAN)) {
    return 'boolean';
  }
  if (t.includes(SqlType.JSON)) {
    return 'object';
  }
  if (t.includes(SqlType.ARRAY)) {
    return 'array';
  }
  return 'string';
};

export const mapSequelizeTypeToFormat = (type: string): string | undefined => {
  const t = (type || '').toUpperCase();
  if (t.includes(SqlType.INT) || t.includes(SqlType.BIGINT) || t.includes(SqlType.SERIAL)) {
    return 'int32';
  }
  if (t.includes(SqlType.FLOAT) || t.includes(SqlType.REAL)) {
    return 'float';
  }
  if (t.includes(SqlType.DATETIME) || t.includes(SqlType.TIMESTAMP)) {
    return 'date-time';
  }
  if (t.includes(SqlType.DATE)) {
    return 'date';
  }
  if (t.includes(SqlType.TIME)) {
    return 'time';
  }
  if (t.includes(SqlType.DOUBLE) || t.includes(SqlType.DECIMAL)) {
    return 'double';
  }
  if (t.includes(SqlType.UUID)) {
    return 'uuid';
  }
  return undefined;
};
