import { execSync } from 'child_process';
import { readFileSync, unlinkSync, existsSync } from 'fs';

test('openapi schema assertions for products', () => {
  const out = 'openapi-assertions.json';
  try { unlinkSync(out); } catch (e) {}
  execSync(`node dist/cli.js --ddl-file examples/ddl/products.sql -o ${out}`);
  expect(existsSync(out)).toBe(true);
  const doc = JSON.parse(readFileSync(out, 'utf8'));
  const schemas: Record<string, any> = (doc.components && doc.components.schemas) || {};
  expect(schemas).toBeDefined();
  const key = Object.keys(schemas).find(k => /product/i.test(k));
  expect(key).toBeDefined();
  const schema = key ? schemas[key] : undefined;
  expect(schema).toBeDefined();
  // id should be integer (or nullable integer array union)
  const idType = schema.properties.id && schema.properties.id.type;
  const idOk = idType === 'integer' || (Array.isArray(idType) && idType.includes('integer'));
  expect(idOk).toBe(true);
  // name should be a string
  const nameType = schema.properties.name && schema.properties.name.type;
  const nameOk = nameType === 'string' || (Array.isArray(nameType) && nameType.includes('string'));
  expect(nameOk).toBe(true);
  // price should be number or numeric-like (NUMERIC may map to string in SQLite)
  const hasPrice = schema.properties && schema.properties.price;
  expect(hasPrice).toBeDefined();
  if (hasPrice) {
    const priceType = schema.properties.price && schema.properties.price.type;
    const isNumericType = (t: any) => t === 'number' || t === 'integer' || t === 'string';
    const priceOk = isNumericType(priceType) || (Array.isArray(priceType) && priceType.some((p: any) => isNumericType(p)));
    expect(priceOk).toBe(true);
  }
  try { unlinkSync(out); } catch (e) {}
});
