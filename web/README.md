# Rust web API

The initial Axum server exposes one endpoint: `GET /api/health`, returning
`{"status":"ok"}`. It listens on `127.0.0.1:3000`.

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
