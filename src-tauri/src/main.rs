// No console window in release builds on Windows.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod session;

use serde_json::Value;
use session::{Keyring, Reply, ReqwestHttp, Session};
use tauri::webview::NewWindowResponse;
use tauri::{Manager, State, Url, WebviewUrl, WebviewWindowBuilder};

const DEFAULT_API_URL: &str = "http://localhost:4800/api/v1";
/// The Vite dev server port (vite.config.ts, tauri.conf.json `devUrl`).
const DEV_PORT: u16 = 1420;

type AppSession = Session<ReqwestHttp, Keyring>;

// The webview's whole IPC surface. None of these returns a token.

#[tauri::command]
async fn login(
    session: State<'_, AppSession>,
    identifier: String,
    password: String,
    kirana_id: Option<String>,
) -> Result<Reply, String> {
    Ok(session.login(&identifier, &password, kirana_id.as_deref()).await)
}

#[tauri::command]
async fn restore_session(session: State<'_, AppSession>) -> Result<Reply, String> {
    Ok(session.restore().await)
}

#[tauri::command]
async fn logout(session: State<'_, AppSession>) -> Result<(), String> {
    session.logout().await;
    Ok(())
}

#[tauri::command]
async fn api_request(
    session: State<'_, AppSession>,
    method: String,
    path: String,
    body: Option<Value>,
) -> Result<Reply, String> {
    Ok(session.request(&method, &path, body).await)
}

/// Only the bundled app, or the Vite dev server in debug builds, may load in the window.
fn is_app_url(url: &Url) -> bool {
    match (url.scheme(), url.host_str()) {
        ("tauri", Some("localhost")) => true,
        ("http" | "https", Some("tauri.localhost")) => true,
        ("http", Some("localhost")) => cfg!(debug_assertions) && url.port() == Some(DEV_PORT),
        _ => false,
    }
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let api_url =
                std::env::var("KIRANA_API_URL").unwrap_or_else(|_| DEFAULT_API_URL.to_string());
            app.manage(AppSession::new(ReqwestHttp::new()?, Keyring, &api_url));
            // Built here, not in tauri.conf.json, to attach the navigation and pop-up guards.
            WebviewWindowBuilder::new(app, "main", WebviewUrl::App("index.html".into()))
                .title("KiranaOS POS")
                .inner_size(1280.0, 800.0)
                .min_inner_size(960.0, 640.0)
                .center()
                .on_navigation(is_app_url)
                .on_new_window(|_, _| NewWindowResponse::Deny)
                .build()?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![login, restore_session, logout, api_request])
        .run(tauri::generate_context!())
        .expect("error while running KiranaOS POS");
}

#[cfg(test)]
mod tests {
    use super::is_app_url;

    #[test]
    fn the_window_only_loads_app_content() {
        for ok in ["http://tauri.localhost/", "tauri://localhost/index.html", "http://localhost:1420/"] {
            assert!(is_app_url(&ok.parse().unwrap()), "{ok}");
        }
        for bad in [
            "https://example.com/",
            "http://localhost:4800/api/v1",
            "http://tauri.localhost.example.com/",
            "file:///C:/Windows/win.ini",
            "about:blank",
        ] {
            assert!(!is_app_url(&bad.parse().unwrap()), "{bad}");
        }
    }
}
