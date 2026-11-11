# Rust web API

The initial Axum server exposes one endpoint: `GET /api/health`, returning
`{"status":"ok"}`. It listens on `127.0.0.1:3000`.

From the repository root, run the API with:

```sh
cargo run -p web
```

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
