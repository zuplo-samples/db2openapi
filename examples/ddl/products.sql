-- examples/ddl/products.sql
CREATE TABLE products (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  image_url TEXT,
  category_id INTEGER,
  price NUMERIC DEFAULT 0.0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
