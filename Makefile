.PHONY: coverage doc frontend-install frontend-watch backend dev frontend-build build release

TARGET_DIR=~/.cache/rust-target
DOC_DIR=/mnt/c/Users/briot/Desktop

coverage:
	cargo make cov
	cp -R ${TARGET_DIR}/llvm-cov/html ${DOC_DIR}/

doc:
	cargo make doc
	cp -R ${TARGET_DIR}/doc ${DOC_DIR}/

# Install the frontend dependencies once, then edit in Vite's hot-reload mode.
frontend-install:
	npm ci

frontend-watch:
	npm run dev

# Run this in a separate terminal while frontend-watch is running.
backend: frontend-build
	cargo run -p web

# Both development processes, with Vite proxying /api to the Axum server.
dev: frontend-build
	./node_modules/.bin/concurrently --kill-others --names api,vite "cargo run -p web" "npm run dev"

# Produce a single release binary containing the built frontend assets.
build: frontend-build
	cargo build --release -p web

frontend-build:
	npm run build

release: build
