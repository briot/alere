use axum::{routing::get, Json, Router};
use serde::Serialize;
use std::net::SocketAddr;

#[derive(Serialize)]
struct HealthResponse {
    status: &'static str,
}

async fn health() -> Json<HealthResponse> {
    Json(HealthResponse { status: "ok" })
}

#[tokio::main]
async fn main() {
    let app = Router::new().route("/api/health", get(health));
    let address = SocketAddr::from(([127, 0, 0, 1], 3000));
    let listener = tokio::net::TcpListener::bind(address)
        .await
        .expect("bind web server address");

    println!("Alere API listening on http://{address}");
    axum::serve(listener, app)
        .await
        .expect("serve HTTP requests");
}
