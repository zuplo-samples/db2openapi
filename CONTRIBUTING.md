# Contributing to DB2OpenAPI

Thanks for your interest in contributing! This file outlines a small workflow to help keep contributions focused and easy to review.

Where to start

- Read the developer docs in `docs/` (especially `docs/sqltype.md`) to understand how types and mapping work.
- Check `ROADMAP.md` for planned improvements and high-level design notes.

Development workflow

1. Fork the repo and create a branch named `feature/<short-desc>` or `fix/<short-desc>`.
2. Run tests locally:

```bash
npm ci
npm run build:clean
npm test
```

3. Add unit tests for new behavior. Unit tests live under `__tests__/` and integration tests use the `.int.test.ts` suffix.
4. Keep changes small and focused; update `README.md` or `docs/` when adding features that affect usage or developer workflows.
5. Run the parity test when you update the `SqlType` enum:

```bash
npx jest __tests__/sqltype.sync.test.ts --runInBand
```

Submitting a PR

- Create a pull request against `main` with a clear title and description of what changed and why.
- Link to issue(s) if applicable.
- CI will run unit tests and a dedicated `parity-check` job to validate `SqlType` vs mapping parity.

Style & guidelines

- Use TypeScript for new modules; keep types narrow and well-documented.
- Add unit tests for small units of behavior and integration tests when touching DB code.

Questions

If you're unsure where to start, open an issue describing what you'd like to change and we can discuss the design first. Thanks for helping improve the project!
