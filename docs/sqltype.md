# SqlType enum

This project centralizes commonly used SQL type tokens in `src/constants.ts` under the `SqlType` enum. The enum lists token fragments that the generator uses to detect types from Sequelize's `describeTable()` (which often returns dialect-normalized type strings).

Why it exists

- Avoids scattered literal strings like `'INT'`/`'VARCHAR'` across the codebase.
- Makes type checks easier to review and unit-test.
- Simplifies extending support for new dialect-specific tokens.

How it is used

- `src/generator/mapping.ts` converts normalized type strings to OpenAPI `type` and `format` hints using `SqlType` tokens.
- `src/generator/responseExamples.ts` generates example values and uses `SqlType` tokens to pick example types.
- Additional helpers or adapters can also reference `SqlType` to ensure consistent behavior.

Extending the enum

1. Add a new token to `src/constants.ts` inside the `SqlType` enum. Use uppercase token names that match substrings found in Sequelize types (for example `TIMESTAMPTZ` or `JSONB`).

2. Update `src/generator/mapping.ts` to map the new token to a suitable OpenAPI `type` and/or `format`.

3. If example generation needs a special value, update `src/generator/responseExamples.ts` to return an appropriate sample for the new token.

4. Add unit tests:
   - Add a small test under `__tests__/` that asserts the token appears in `SqlType` and that `mapSequelizeTypeToOpenAPIType(token)` returns a defined value.
   - Add an integration test if the token is dialect-specific to validate behavior against a running DB instance.

5. Run the full test suite (`npm test`) and adjust until green.

Notes

- The enum is intentionally token-based and matching is performed against an uppercase-normalized type string. If you need more precise parsing, consider adding a strict mode that uses regular expressions or a tokenized parser.

- Keep the enum small and focused on tokens actually used by the code to avoid maintenance overhead.
