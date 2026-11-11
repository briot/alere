# Rust web API

The Axum server exposes `GET /api/health`, returning `{"status":"ok"}`, and
`GET /api/account/list`, returning the account-list arrays expected by the
restored frontend. At startup it imports `./Comptes.kmy`; set `ALERE_KMY` to
use another KMyMoney file. It listens on `127.0.0.1:3000`.
Each request is logged with its method, full URI, and response status, including
unsupported paths (for example, `GET /api/accounts -> 404`).

`GET /api/plots/networth?currency=1&dates=2025-11-11,2026-10-11,2026-11-11`
returns one object per net-worth account. Each object has `accountId`, plus
`shares` and `price` arrays aligned with the requested dates. `currency` is a
commodity ID from `/api/account/list`; dates use `YYYY-MM-DD` format.

`GET /api/metrics?mindate=2025-11-11&maxdate=2026-11-11&currency=1`
returns income, expenses, taxes, net worth, and liquid assets for the inclusive
date range. Its fields are `income`, `passive_income`, `work_income`,
`expenses`, `income_taxes`, `other_taxes`, `networth`, `networth_start`,
`liquid_assets`, and `liquid_assets_at_start`.

`GET /api/networth_history?mindate=1970-01-01&maxdate=2200-01-01&groupby=months&currency=1`
returns `{date, networth}` points in the requested currency. `groupby` accepts
`days`, `months`, or `years`; the optional `scheduled` flag is accepted but has
no effect because recurring transactions are not represented yet.

`GET /api/ledger/10,11?mindate=2025-11-11&maxdate=2026-11-11&currency=1`
returns transactions affecting the listed account IDs. Each transaction
includes all of its splits and the legacy frontend ledger fields. Split amounts
and running balances are converted to the requested currency; share quantities
remain in their account commodity. Recurring transactions are not returned.

From the repository root, build the frontend once and run the API with:

```sh
make backend
```

The backend target builds `dist/` first because the Axum binary embeds those
files at compile time.

In another terminal, check it with:

```sh
curl http://127.0.0.1:3000/api/health
```

## Frontend

The restored React app is the historical frontend from
`version2/end_of_django`. Its Vite development server proxies `/api` requests
to the Rust server above. Install dependencies and start the frontend from the
repository root:

```sh
npm ci
npm run dev
```

Build static frontend assets with:

```sh
npm run build
```

The build is written to `dist/`. The historical UI still calls the broader
Django API, so it needs those endpoints migrated before its finance screens
can work with this one-route Rust scaffold. The health route is the starting
point for adding and wiring frontend queries.

## Make targets

- `make frontend-install` runs `npm ci` once.
- `make frontend-watch` runs Vite with hot reload and proxies `/api` to port
  3000. Run `make backend` in another terminal for the API. Frontend edits do
  not rebuild the Rust server.
- `make dev` starts both development processes together.
- `make build` builds the frontend and then compiles the optimized Rust
  executable with the generated `dist/` files embedded in it.

The standalone executable is `target/release/web`. Run it directly; it serves
both the API and the embedded frontend on `127.0.0.1:3000`. Set `ALERE_ADDR` to
change the listen address. Re-run `make build` after frontend changes to update
the assets embedded in the executable.
