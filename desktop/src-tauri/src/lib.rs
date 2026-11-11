use tauri::{Manager, Url, WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_opener::OpenerExt;

/// Portal the window opens. Override with VOIDCLOUD_PORTAL_URL (e.g. http://localhost:3000).
const DEFAULT_PORTAL_URL: &str = "https://voidcloud.cc.cd/voidcloud/dashboard";

/// Only Void Cloud hosts and localhost load inside the app window; every other
/// link opens in the system browser so foreign pages never share the session.
fn is_trusted(url: &Url) -> bool {
    match url.host_str() {
        Some(h) => h == "voidcloud.cc.cd" || h.ends_with(".voidcloud.cc.cd") || h == "localhost" || h == "127.0.0.1" || h == "tauri.localhost",
        None => url.scheme() == "tauri",
    }
}

fn portal_url() -> Url {
    std::env::var("VOIDCLOUD_PORTAL_URL")
        .ok()
        .and_then(|s| Url::parse(&s).ok())
        .filter(is_trusted)
        .unwrap_or_else(|| Url::parse(DEFAULT_PORTAL_URL).expect("valid default URL"))
}

fn urlencode(s: &str) -> String {
    s.bytes()
        .map(|b| match b {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => (b as char).to_string(),
            _ => format!("%{:02X}", b),
        })
        .collect()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.unminimize();
                let _ = w.set_focus();
            }
        }))
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let handle = app.handle().clone();
            // Bundled splash page redirects to the portal or shows an offline screen.
            let splash = format!("index.html?portal={}", urlencode(portal_url().as_str()));
            WebviewWindowBuilder::new(app, "main", WebviewUrl::App(splash.into()))
                .title("Amer DevOps Portal")
                .inner_size(1360.0, 860.0)
                .min_inner_size(960.0, 600.0)
                .on_navigation(move |url| {
                    if is_trusted(url) {
                        true
                    } else {
                        let _ = handle.opener().open_url(url.as_str(), None::<&str>);
                        false
                    }
                })
                .build()?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Amer DevOps Portal");
}
