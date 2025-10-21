.PHONY: examples examples-products examples-postgres

examples: examples-products

examples-products:
	@echo "Generating OpenAPI from examples/ddl/products.sql"
	@db2openapi --ddl-file examples/ddl/products.sql -o openapi-products.json -e -T lorem || true

examples-postgres:
	@echo "Generating OpenAPI from examples/ddl/postgres_products.sql (may require a running Postgres)"
	@db2openapi --ddl-file examples/ddl/postgres_products.sql -o openapi-postgres.json -e -T lorem || true
