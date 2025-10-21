## DDL File Usage

Alternatively, generate from a local SQL DDL file (no DB connection required):

```bash
db2openapi --ddl-file ./schema.sql -o openapi-from-ddl.json -e -T lorem
```
The `--ddl-file` option executes the supplied SQL statements against an in-memory SQLite instance and then generates the OpenAPI document from that schema. This is handy for previewing without an actual database.

Tests: DDL-based generation

This repository includes a Jest test that runs the generator against `schema.sql` to verify DDL-based generation. It uses the same generator codepath as the CLI, so `--ddl-file` is a supported option for both testing and ad-hoc generation.

Parity notes

- Using a DDL + in-memory SQLite is intended for quick feedback and testing. It may NOT always produce identical OpenAPI output to connecting to a live database (Postgres/MySQL/etc.) because:
  - Dialect-specific types and metadata (ENUMs, SERIAL, array types, column comments) may not translate exactly to SQLite.
  - Sequelize's `describeTable` returns SQLite-normalized types for an in-memory run, which can change `format` hints.

- For full fidelity testing against a target dialect, consider running the DDL inside a small container for that database (Postgres/MySQL) in CI and running the generator against it.
# DB2OpenAPI

Generate an OpenAPI/Swagger specification from your SQL database. The OpenAPI spec will be written to a file.

## Motivation

There are [several DB to API projects](https://github.com/dbohdan/automatic-api) out there, but they almost all lock you into building your API a certain way or using their managed service to get the full experience. I'd prefer to decouple the API definition from the API implementation - you are free to use your generated OpenAPI specification with any OpenAPI-compliant web framework (ex. Huma, tsoa, Connexion) and develop your DB-backed CRUD APIs with tools you're already familiar with / using. If you don't want to tie your API directly to your database, this is essentially a quickstart to building a CRUD API.

## Database Support

This project uses [Sequelize](https://sequelize.org/) under the hood, which supports

- PostgreSQL
- MariaDB
- MySQL
- MSSQL
- SQLite
- Oracle

## Local Installation

```bash
npm run build
npm install -g
```

## Usage

Invoke using the `db2openapi` command. Here's an example connecting to a Supabase Postgres Database and including generated response examples with a theme:

```bash
db2openapi -t postgres -h aws-0-us-west-1.pooler.supabase.com -p 5432 -u postgres.ndizqitliqszxibppdxg -P <YOUR_DB_PASSWORD> -d postgres --e -T tech

```

| Option               | Required | Description                                                 |
| -------------------- | -------- | ----------------------------------------------------------- |
| `-t` or `--type`     | Y        | Database type (e.g., postgres, mysql)                       |
| `-h` or `--host`     | Y        | Database host                                               |
| `-p` or `--port`     | Y        | Database port                                               |
| `-u` or `--username` | Y        | Database username                                           |
| `-P` or `--password` | Y        | Database password                                           |
| `-d` or `--database` | Y        | Database name                                               |
| `-o` or `--output`   | N        | Output file for the OpenAPI document. Default: openapi.json |

| `--response-examples` | N        | Include generated response examples for endpoints. Default: false |
| `--theme <theme>`    | N        | Theme to use for generated text fields in response examples. Supported: `lorem`, `names`, `tech`. Default: `lorem` |

The output OpenAPI file will have CRUD endpoints (Ex. GET, GET all, POST, PATCH, DELETE) generated for you, alongside an OpenAPI component that describes your table using JSON schema. Here's an example:

Some things to note:

- The primary key is assumed to be the only key usable for lookups
- The primary key is marked `readonly` as to not be included in mutating (ex. POST) requests
- The `format` property is used to hint at underlying types

```json
{
  "openapi": "3.0.0",
  "info": {
    "title": "Generated API",
    "version": "1.0.0"
  },
  "paths": {
    "/products": {
      "get": {
        "summary": "Get list of products",
        "responses": {
          "200": {
            "description": "A list of products",
            "content": {
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": {
                    "$ref": "#/components/schemas/Products"
                  }
                }
              }
            }
          }
        }
      },
      "post": {
        "summary": "Create a new product",
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Products"
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "product created successfully"
          }
        }
      }
    },
    "/products/{id}": {
      "get": {
        "summary": "Get a specific product by id",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "A single product",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Products"
                }
              }
            }
          },
          "404": {
            "description": "product not found"
          }
        }
      },
      "put": {
        "summary": "Update a specific product by id",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Products"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "product updated successfully"
          },
          "404": {
            "description": "product not found"
          }
        }
      },
      "delete": {
        "summary": "Delete a specific product by id",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "product deleted successfully"
          },
          "404": {
            "description": "product not found"
          }
        }
      }
    }
  },
  "components": {
    "schemas": {
      "Products": {
        "type": "object",
        "properties": {
          "id": {
            "type": "integer",
            "format": "int32",
            "default": null,
            "readOnly": true
          },
          "name": {
            "type": "string",
            "default": null
          },
          "image_url": {
            "type": ["string", "null"],
            "default": null
          },
          "category_id": {
            "type": ["integer", "null"],
            "format": "int32",
            "default": null
          }
        },
        "required": ["id", "name"]
      }
    }
  }
}
```

## Tests & coverage

This project includes unit tests (Jest) and a coverage report in LCOV/HTML format.

Commands

- Run tests:

```bash
npm test
```

- Run tests with coverage (generates `coverage/lcov.info` and `coverage/lcov-report`):

```bash
npm run test:cov
```

- Running coverage produces the standard LCOV report at `coverage/lcov.info` and an HTML report under `coverage/lcov-report/`. For editor extensions that require absolute paths, this project also generates `coverage/lcov.abs.info` locally (via a post-test script) to help those tools match files in the workspace. The absolute file is optional and not required by CI services.

Open the HTML report:

```bash
# serve the HTML report on port 8000
python3 -m http.server 8000 --directory coverage/lcov-report
```

Then open the report in your browser (for example http://localhost:8000 if you served it locally).


## Build

This project uses TypeScript. To compile the sources into the `dist/` folder run:

```bash
npm run build
```

To remove the `dist/` directory before building (useful when switching branches or ensuring a clean build), use the convenience script added to this project:

```bash
npm run build:clean
```

`build:clean` runs `npm run clean` (which removes `dist/`) and then `npm run build`.

## Running examples

The `examples/` directory contains sample DDL files you can use to quickly try the CLI. Example:

```bash
db2openapi --ddl-file examples/ddl/products.sql -o openapi-products.json -e -T lorem
```

This will execute the DDL in an in-memory SQLite database and write `openapi-products.json`.

## Developer docs

Developer-facing documentation lives in the `docs/` folder. See `docs/sqltype.md` for details on the `SqlType` enum and how to extend it.

## Continuous Integration (CI)

This project includes a GitHub Actions workflow (see `.github/workflows/ci.yml`) that runs on pushes and pull requests. The CI pipeline:

- Installs dependencies with `npm ci`.
- Builds the TypeScript sources with `npm run build:clean`.
- Runs unit tests (Jest) in the primary job.
- Runs a separate integration job which starts a Postgres service (Postgres 15) and runs the integration test suite (`npm run test:integration`) against the running database to validate real-world behavior.
- Cleans up generated example outputs at the end of the job using `npm run clean:examples`.

The integration job is configured to fail fast if required database environment variables are not present; this ensures CI clearly indicates when the environment isn't configured for integration runs.

### Troubleshooting CI failures

Common issues you may see in CI and how to address them:

- Missing DB environment variables: the Postgres integration job requires DB-related env vars (for local runs) or uses the service container values in CI. If you see errors like "DB_HOST is required", ensure the workflow or local command sets `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, and `DB_DATABASE` (or use the provided service in CI).
- Postgres not ready / connection refused: the CI job waits for `pg_isready` but sometimes containers are slow to initialize. Re-running the job or increasing the health-check retries/timeouts in `.github/workflows/ci.yml` can help.
- Missing native drivers or install failures: some test jobs (or local builds) require native modules like `sqlite3` or `pg`; ensure your CI runner supports building native modules or use the prebuilt binaries by matching Node version and platform.
- `dist/` not built before running CLI: integration tests call the compiled CLI (`node dist/cli.js`). If tests fail because `dist/` is missing, run `npm run build:clean` before running integration tests.
- Permission or filesystem errors when writing `openapi-*.json`: ensure the working directory is writable (CI containers usually are); locally, run the commands from the repository root or adjust output paths.

If you hit an unexpected CI failure, capturing the full job log and the failing test command is the quickest way to diagnose the cause. You can reproduce most CI integration failures locally by following the "Examples & integration tests" commands above.

## Examples & integration tests

Examples are under `examples/ddl/` and are intended for quick, local sanity checks. The repository also provides convenience targets and scripts to exercise them:

- `npm run examples` — runs the Makefile example targets (uses the `examples/ddl` files to produce `openapi-*.json` outputs).
- `npm run clean:examples` — removes generated `openapi-*.json` files created by examples and tests.

Integration tests end with the `.int.test.ts` suffix and are run separately from unit tests. To run integration tests locally against a live Postgres instance:

```bash
npm run build:clean
DB_HOST=localhost DB_PORT=5432 DB_USERNAME=postgres DB_PASSWORD=<pw> DB_DATABASE=postgres npm run test:integration
```

You can also run the Postgres example target (which uses the Postgres-specific DDL in `examples/ddl/postgres_products.sql`) via:

```bash
make examples-postgres
```

Running examples or integration tests against a real instance of your target DB engine is recommended when verifying dialect-specific features (enums, arrays, serial types, etc.).

## (Postgres/MySQL). Expect type/format differences for dialect-specific types.

- Enum types, array types, and some precision/format hints are dialect-specific; using a local SQLite run (via `--ddl-file`) is a fast way to preview the OpenAPI document, but it may not capture every nuance of your target DB engine.

- Is DDL + SQLite good enough to create an API for general use?

  - Short answer: sometimes. For a majority of CRUD-style APIs where your endpoints are thin wrappers around simple table-backed resources (IDs, strings, timestamps, booleans, and numeric types), generating an OpenAPI spec from DDL executed in SQLite will usually produce a usable API definition that you can wire into an HTTP framework.

  - Caveats where SQLite-driven introspection can differ from your target DB:
    - ENUM types: Postgres `ENUM` definitions carry a fixed set of values. When run through SQLite, Sequelize may normalize those columns to `TEXT` or omit the enum value list, so the generated schema might lose the explicit enum `enum: [...]` constraint and examples.
    - Array types: Postgres arrays (e.g., `text[]`) and some MySQL set types don't exist in SQLite. They may be mapped to a fallback type (text) or lose array semantics entirely in the generated spec.
    - Serial/sequence types: MySQL `AUTO_INCREMENT`, Postgres `SERIAL`/`BIGSERIAL` are normalized by SQLite; `format` hints (int32 vs int64) may differ.
    - Dialect-specific types: `JSONB`, `UUID` extensions, `TIMESTAMPTZ`, `GEOMETRY`, and other vendor-specific types may be represented more generally (string or blob) by SQLite + Sequelize.
    - Column comments and some metadata: certain drivers expose richer metadata that Sequelize can surface (for example, comments or column-level defaults). These may not be available from an in-memory SQLite run.

  - When DDL + SQLite is adequate:
    - Early-stage prototyping where you need a quick OpenAPI document to iterate on client/server contracts.
    - Small internal services where the exact DB types are not critical to the API consumers (e.g., you treat `uuid` and `string` equivalently in consumers).
    - Generating initial scaffolding that will be validated against a real DB later in CI or pre-release testing.

  - When you should use a real DB instance for introspection:
    - Production APIs where schema constraints (enums, arrays, numeric precision) must be accurate and enforced by generated validation.
    - When you rely on dialect-specific capabilities (Postgres `JSONB` behavior, array containment operators, spatial types) that should reflect in the OpenAPI schema or example responses.
    - When column comments, defaults, or extended metadata are part of your API contract.

- Best practices and recommended workflow

  1. Fast local iteration: use `--ddl-file` (SQLite) to rapidly generate an initial OpenAPI spec and iterate on endpoints and examples.
  2. Dialect validation in CI: add an integration job that runs your DDL inside a service container for the target DB engine (for example, Postgres or MySQL) and runs the generator against that living DB. This verifies dialect parity and is already modeled in the repository's CI integration job.
  3. Mapping overrides: if you need deterministic OpenAPI types regardless of the introspected output, provide a small JSON mapping override (we can add CLI support for this). The mapping would declare how to treat certain DB types (for example, map `uuid` → `string` with `format: uuid`, `jsonb` → `object`).
  4. Post-generation checks: add unit tests or schema assertions in CI that validate critical types and constraints in the generated OpenAPI file (for example, assert that a given component property has `enum: [...]`, or that a field is `type: array`).
  5. Manual inspection for edge cases: some DB features (stored procedures, user-defined types) are out-of-scope for automated mapping and should be reviewed manually.

If you'd like, I can add an example CI integration snippet and/or a small `mappings.json` proof-of-concept that demonstrates overriding detected types with explicit OpenAPI mappings.
- The examples are small and intended for quick sanity checks; for production validation run tests against a real instance of your target DB engine.


