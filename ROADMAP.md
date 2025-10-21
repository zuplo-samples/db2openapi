Multi-file DDL support (deferred)

Goal
- Accept a directory or glob of SQL files (migrations) in addition to a single SQL dump file.
- Apply files in a deterministic order to an in-memory SQLite database so the generator can inspect the resulting schema.

Design notes
- Input modes:
  - Single file: `--ddl-file path/to/schema.sql`
  - Directory: `--ddl-dir path/to/migrations/` (apply all `*.sql` files)
  - Glob: `--ddl-glob "migrations/**/*.sql"`
- Ordering:
  - Natural sort by filename (honor numeric prefixes like `001_...`, `20231001_...`).
  - Provide an optional manifest `ddl-manifest.json` if ordering cannot be inferred.
- Statement splitting challenges:
  - Must handle `;` inside dollar-quoted PostgreSQL functions ($$...$$).
  - Must support MySQL `DELIMITER` blocks and stored procedure bodies.
  - Must strip comments (`--`, `/* */`) before naive splitting.
  - Recommended: implement a lightweight stateful splitter that tracks quote/dollar-quote contexts and `DELIMITER` usage.
- Dependency ordering:
  - Optionally disable FK checks while loading (e.g. `PRAGMA foreign_keys = OFF` for SQLite) to allow out-of-order application.
  - Re-enable and validate after load.
- Dialect parity:
  - SQLite will accept many DDL forms but not all dialect-specific constructs; detect unsupported SQL and warn.
  - Consider `--strict` to fail on unsupported constructs.

Testing
- Unit tests for:
  - Ordering: ensure `001_create.sql` then `002_alter.sql` reproducibly.
  - Dollar-quoted functions and `DELIMITER` usage do not break the splitter.
  - Files with comments and inline semicolons.
  - FK cycles loaded with FK-checks disabled.

Implementation notes
- New helper: `lib/ddl.ts` with `loadDDLFiles(pathOrGlob)` => returns Sequelize instance after applying files.
- CLI changes: accept `--ddl-dir` / `--ddl-glob` aliases, or accept a path and detect file vs dir vs glob.

Robust SQL runner and adapter (deferred but planned)
- Robust SQL runner: better statement splitting that strips comments and handles $$-quoted bodies and MySQL `DELIMITER` blocks.
- Multi-file and directory support for `--ddl-file` (accept a folder or glob).
- Optional dialect override / mapping hints so users can indicate target DB (Postgres/MySQL) and we can map types better.
- Adapter interface: add a simple `SchemaAdapter` so we can later plug a pure-DDL parser or a containerized DB runner without changing the generator.

Why deferred
- Current in-memory single-file flow is working and covered by tests.
- Multi-file support adds parsing complexity and risk; prefer to implement when needed or when you want higher fidelity.

Next action (when ready)
- Implement `lib/ddl.ts` with robust splitter and tests (2-3 days work estimate).
- Add CLI acceptance and README docs.

Additional refactors & improvements (suggested)

- Centralize SQL type tokens and other "magic strings":
  - Add a `SqlType` enum (or similar) in a shared constants module to list common type tokens like `INT`, `CHAR`, `TEXT`, `DATE`, `JSON`, `ARRAY`, `UUID`, `ENUM`, etc. This enum can be used by the mapping and example generators to avoid scattered string literals and typos.
  - Consider centralizing other repeated strings (component names, default themes, CLI option defaults) into the same constants module for consistency.

- Improve type matching precision:
  - Currently the generator uses substring `includes()` checks on normalized (uppercase) type strings. For dialect parity or stricter matching, offer an optional mode that uses regular expressions or tokenized parsing to avoid false positives (for example distinguishing `INT` vs `INTERVAL` or `CHAR` inside larger tokens).
  - Provide a configuration flag (CLI or env) to toggle "strict" type matching vs permissive matching for quicker DDL preview.

- Dialect-aware mapping expansion:
  - Expand the `SqlType` enum to include more tokens (VARCHAR, NUMERIC, SERIAL/BIGSERIAL, JSONB, TIMESTAMPTZ, etc.) and map those to more precise OpenAPI `type`/`format` hints.
  - Optionally allow user-provided mapping overrides (a small JSON mapping file) for corner cases.

- Follow-up maintenance tasks:
  - Add tests that assert the `SqlType` enum is in sync with the mapping logic (unit tests that ensure every referenced token is handled).
  - Replace scattered string checks in `responseExamples.ts`, `mapping.ts`, and other helpers with the centralized enum constants.

These changes improve maintainability, reduce typos, and make it easier to add dialect-specific handling over time.

Next steps

- Iterate on the `SqlType` enum: add missing tokens (VARCHAR, NUMERIC, JSONB, TIMESTAMPTZ, etc.) and adjust mappings where necessary.
- Add unit tests that exercise more dialect-specific examples (Postgres, MySQL) to ensure the mapping behaves as expected across DBs.
- Consider a CLI flag `--type-matching=strict|permissive` that switches between regex/tokenized matching and substring matching.
- Add developer documentation (see `docs/sqltype.md`) describing the `SqlType` enum, where it's used, and how to extend it safely.

Proposed SqlType expansion

Here is a suggested expanded list of tokens to include in the `SqlType` enum to improve dialect coverage. These tokens are intended to match substrings returned by Sequelize's `describeTable()` and should be normalized/uppercased before matching.

- INT
- BIGINT
- SERIAL
- BIGSERIAL
- SMALLINT
- TINYINT
- FLOAT
- DOUBLE
- DECIMAL
- NUMERIC
- REAL
- CHAR
- VARCHAR
- TEXT
- CLOB
- DATE
- DATETIME
- TIMESTAMP
- TIMESTAMPTZ
- TIME
- BOOLEAN
- JSON
- JSONB
- ARRAY
- UUID
- ENUM
- BYTEA
- INTERVAL
- GEOMETRY
- UUID_OSSP

When adding tokens, update `mapping.ts` and `responseExamples.ts` accordingly and add unit tests to assert mapping parity.

Performance testing

- Need: establish general performance tests and benchmarks for hotspot code paths (SQL splitting, DDL application, OpenAPI generation) so we can detect regressions and prioritize optimizations.

- Why: the generator does character-level parsing and database introspection; while current performance is fine for small example DDLs, real-world schemas and CI runs can be larger. A repeatable benchmark lets us: measure improvements, detect regressions, and decide whether low-level micro-optimizations are justified.

- Approach:
  - Microbenchmarks: write small, focused benchmarks for `splitSqlStatements` and other hot helpers using a harness (Node's `perf_hooks` or a simple timing runner). Feed them realistic large DDL samples (multi-MB SQL files, many functions, large numbers of tables) to simulate worst-case input.
  - End-to-end benchmarks: measure the entire generation pipeline (DDL load → Sequelize introspect → OpenAPI generation) on representative schemas (small, medium, large) and record wall-clock time, memory usage, and GC pauses.
  - CI integration: add an optional `bench` job that runs the microbenchmarks on demand (not on every PR by default) and archives results as JSON or CSV artifacts. Optionally run a lightweight baseline benchmark in the fast `parity-check` job to detect obvious regressions.
  - Regression detection: store baseline numbers in the repo (or a separate results store) and fail a benchmark job when a threshold is exceeded (e.g., +20% wall time for a given benchmark). Keep thresholds conservative to avoid noisy failures.
  - Profiling: when a benchmark regresses, run a profiler (Node's `--prof` or v8-profiler) to pinpoint hot functions and guide targeted optimizations (e.g., reduce substring allocations, avoid repeated regex matching, or simplify state machine logic).

- Implementation notes:
  - Add a `bench/` directory with harness scripts and example large DDL inputs (or instructions to generate them). Bench scripts should be deterministic and include warm-up runs for JIT stability.
  - Prefer micro-optimizations only after profiling and confirming hotspots. Readability and correctness retain priority for non-hot paths.

- Next action:
  - Create `bench/splitter-bench.js` and `bench/pipeline-bench.js` and add an npm script `npm run bench` to run the suite locally. After that, consider a lightweight CI baseline run.

Mapping overrides (`mappings.json`) — next steps

- Goal: allow deterministic, user-controlled overrides for how database types detected by Sequelize should be translated to OpenAPI types/formats/schemas. This reduces reliance on dialect-specific detection and ensures consistent API contracts across environments.

- Suggested format (JSON):

  ```json
  {
    "mappings": {
      "uuid": { "type": "string", "format": "uuid" },
      "jsonb": { "type": "object" },
      "int": { "type": "integer", "format": "int32" },
      "bigint": { "type": "integer", "format": "int64" },
      "text[]": { "type": "array", "items": { "type": "string" } }
    },
    "defaults": {
      "string": { "type": "string" },
      "number": { "type": "number" }
    }
  }
  ```

- Key behaviors and precedence:
  - Keys in `mappings` are matched against the normalized Sequelize `type` string. Matching should support exact tokens and simple substring matches (configurable `strict` vs `permissive` mode).
  - When a mapping exists for a detected DB type, it overrides the generator's default mapping for that column.
  - `defaults` provides fallback OpenAPI shapes when no mapping is found.
  - CLI flag `--mappings path/to/mappings.json` loads the file at generation time. We can also look for a default `db2openapi.mappings.json` in the repo root.

- Implementation notes:
  - Add loader utility `src/generator/mappingOverrides.ts` that reads and validates the JSON file, normalizes keys to upper-case, and exposes a `getOverride(normalizedDbType)` function.
  - Integrate into the existing mapping pipeline in `src/generator/mapping.ts`: check `getOverride()` before applying built-in heuristics.
  - Add unit tests to assert overrides are applied and precedence is respected (e.g., mapping for `UUID` returns `format: uuid` even when SQLite introspection returns `TEXT`).

- CI & docs:
  - Document `mappings.json` format in `docs/` and add a short README example showing typical overrides for Postgres.
  - Add a CI example that runs generation with a sample `mappings.json` and asserts expected shapes in the generated OpenAPI output.

- Next action (short-term):
  - Implement `src/generator/mappingOverrides.ts`, add a test fixture `__tests__/mappings.override.test.ts`, and add CLI wiring for `--mappings` (small, opt-in change). Estimate: 1-2 days.


