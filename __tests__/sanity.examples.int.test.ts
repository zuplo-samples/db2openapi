import { execSync } from 'child_process';
import { existsSync, unlinkSync, readFileSync } from 'fs';
import { Client } from 'pg';
const { Theme } = require('../src/constants');

describe('examples sanity', () => {
  const out = 'openapi-sanity-test.json';
  afterEach(() => {
    try { unlinkSync(out); } catch (e) {}
  });

  test('generate openapi from example DDL and contains schema fields', async () => {
    execSync(`node dist/cli.js --ddl-file examples/ddl/products.sql -o ${out}`);
    expect(existsSync(out)).toBe(true);
    const doc = JSON.parse(readFileSync(out, 'utf8'));
    // Check components and a schema for Products (kebab/camel mapping may vary)
    expect(doc.components).toBeDefined();
    const schemas: Record<string, any> = (doc.components && doc.components.schemas) || {};
    const hasProducts = Object.keys(schemas).some(k => /product/i.test(k));
    expect(hasProducts).toBe(true);
    // pick first product-like schema and check some properties
    const productKey = Object.keys(schemas).find(k => /product/i.test(k));
    const productSchema = productKey ? schemas[productKey] : undefined;
    expect(productSchema.properties).toBeDefined();
    expect(productSchema.properties.name).toBeDefined();
    expect(productSchema.properties.id).toBeDefined();
  });

  test('generate openapi from postgres example (requires pg) - smoke', async () => {
    // If DB env vars are present, apply the DDL to the running Postgres and run the generator against that DB.
    const dbHost = process.env.DB_HOST || process.env.POSTGRES_HOST;
    const dbPort = process.env.DB_PORT || process.env.POSTGRES_PORT || '5432';
    const dbUser = process.env.DB_USERNAME || process.env.POSTGRES_USER || 'postgres';
    const dbPassword = process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD || 'postgres';
    const dbName = process.env.DB_DATABASE || process.env.POSTGRES_DB || 'testdb';

    if (!dbHost) {
      // In CI we want tests to fail fast if the DB is not available.
      if (process.env.CI || process.env.GITHUB_ACTIONS) {
        throw new Error('DB_HOST is required in CI for Postgres integration tests');
      }
      // Otherwise skip locally.
      console.log('Skipping live Postgres test (no DB_HOST)');
      return;
    }

    const sql = readFileSync('examples/ddl/postgres_products.sql', 'utf8');
    const client = new Client({ host: dbHost, port: Number(dbPort), user: dbUser, password: dbPassword, database: dbName });
    await client.connect();
    try {
      // apply DDL to the running Postgres
      await client.query(sql);
    } catch (err) {
      // ignore if table already exists
      if (!/already exists/i.test(String(err))) {
        await client.end();
        throw err;
      }
    }
    await client.end();

    // Run the CLI against the live Postgres instance
    execSync(`node dist/cli.js -t postgres -h ${dbHost} -p ${dbPort} -u ${dbUser} -P ${dbPassword} -d ${dbName} -o ${out}`);
    expect(existsSync(out)).toBe(true);
    const doc = JSON.parse(readFileSync(out, 'utf8'));
    expect(doc.components).toBeDefined();

    // cleanup created table
    const cleanupClient = new Client({ host: dbHost, port: Number(dbPort), user: dbUser, password: dbPassword, database: dbName });
    await cleanupClient.connect();
    try { await cleanupClient.query('DROP TABLE IF EXISTS products_pg'); } catch (e) {}
    await cleanupClient.end();
  });
});
