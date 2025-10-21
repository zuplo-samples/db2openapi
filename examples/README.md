# Examples

This folder contains small SQL DDL examples you can run locally to generate OpenAPI output using the `db2openapi` CLI.

Files:

- `ddl/products.sql` - simple products table.
- `ddl/enum_and_defaults.sql` - users table demonstrating defaults and enum-like CHECK.
- `ddl/composite_pk.sql` - order_items table with a composite primary key.

Run an example:

```bash
# generate openapi from products example
db2openapi --ddl-file examples/ddl/products.sql -o openapi-products.json -e -T lorem
```

Notes:

- Examples are designed to run on SQLite (used by the CLI for DDL preview). Dialect-specific features (native ENUMs, arrays) may not behave identically on SQLite; for full fidelity, run the DDL on the target DB engine and point the CLI to that database.
