## 1. Prepare

- [ ] 1.1 Rebuild workspace packages (`pnpm -r --filter "./packages/*" build`) so `dist/` matches the tree after the upstream merge; record success.

## 2. Measure

- [ ] 2.1 Run `pnpm guard`; record exit code and duration.
- [ ] 2.2 Run `pnpm typecheck`; record exit code, duration, and any error text.
- [ ] 2.3 Run `pnpm --filter @open-design/daemon test` in the background with a generous timeout; record duration, counts and failing test names.
- [ ] 2.4 Run `pnpm --filter @open-design/web test`; record duration, counts and failing test names.

## 3. Record

- [ ] 3.1 Write `baseline.md` in the commerce-removal phase directory with commands, durations, counts, and exact names of pre-existing failures.
