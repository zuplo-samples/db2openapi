-- examples/ddl/postgres_products.sql
-- PostgreSQL-specific example (uses SERIAL and array type)
CREATE TABLE products_pg (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  price NUMERIC(10,2) DEFAULT 0.0,
  created_at TIMESTAMPTZ DEFAULT now()
);
