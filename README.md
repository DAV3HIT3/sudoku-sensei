# Sudoku Sensei

A Sudoku game that teaches advanced solving techniques. The plan and roadmap are in
[`docs/PLAN.md`](docs/PLAN.md).

## Running it

Node 24, and the `sudokusensei_dev` database on home-db (see the
[monster README](https://github.com/DAV3HIT3/monster)). Never point development
at `sudokusensei`: the app migrates whatever database it starts on.

```bash
cp .env.example .env.local   # fill in the password
npm install
npm run dev                  # http://localhost:3000
```

`npm test` runs the engine tests (`lib/sudoku`): a hand-built position for each
technique, and every solver step on every puzzle in `content/puzzles.txt` checked
against its solution. The app applies its migrations (`db/migrations`) on start-up,
then copies the technique catalog, grades every puzzle in `content/puzzles.txt`,
and stores each one's drills.

Technique write-ups are in `content/techniques/<slug>.md`: a `# Name` heading, then
plain paragraphs separated by blank lines (no other Markdown is rendered).

`npm run generate -- --per 12 --minutes 5` adds generated puzzles to
`content/puzzles.txt` until each technique is the hardest step of 12 of them, or
time runs out. Commit the result. After changing
`db/schema.ts`, run `npm run db:generate` and commit the new migration.

Players are identified by the `Tailscale-User-Login` header, which the sidecar adds
to each request. It is trusted only with `TRUST_TAILSCALE_HEADERS=true`, which only
the monster deployment sets. In development, `DEV_USER_LOGIN` stands in for it.
Sign-in methods live in `identities`, separate from `users`, so that public accounts
can be added later. See "Built to go public" in `docs/PLAN.md`.

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
