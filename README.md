# Sudoku Sensei

A Sudoku game that teaches advanced solving techniques. The plan and roadmap are in
[`docs/PLAN.md`](docs/PLAN.md).

## Running it

Node 24, and the `sudokusensei` database on home-db (see the
[monster README](https://github.com/DAV3HIT3/monster)).

```bash
cp .env.example .env.local   # fill in the password
npm install
npm run dev                  # http://localhost:3000
```

The app applies its migrations (`db/migrations`) on start-up. After changing
`db/schema.ts`, run `npm run db:generate` and commit the new migration.

Players are identified by the `Tailscale-User-Login` header, which the sidecar adds
to each request. In development `DEV_USER_LOGIN` stands in for it.

## Deploying

Runs on monster as the app and a Tailscale sidecar, at
`https://sudoku-sensei.tail3d5daf.ts.net` only. No host port is published: the
tailnet is the access control, and the identity headers are only trustworthy
because every request comes through the sidecar. Deploy a `main` commit whose CI
passed:

```bash
ssh monster 'cd ~/proj/sudoku-sensei && git pull --ff-only && \
  SENSEI_TAG=$(git rev-parse --short HEAD) docker compose -f deploy/compose.yml up -d --build'
```

Roll back with `SENSEI_TAG=<older-sha> docker compose -f deploy/compose.yml up -d`.
`deploy/.env` on monster (mode 600, not in git) holds `DATABASE_URL`, the
`postgres:5432` form from `add-app.sh`.
