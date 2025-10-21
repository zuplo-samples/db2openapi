-- examples/ddl/composite_pk.sql
CREATE TABLE order_items (
  order_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  price NUMERIC,
  PRIMARY KEY (order_id, product_id)
);
