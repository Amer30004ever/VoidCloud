# Amer DevOps Portal — desktop client (Tauri 2)

Native window around the Void Cloud portal for Windows, macOS and Linux.

- Opens `https://voidcloud.cc.cd/voidcloud/dashboard` (override with `VOIDCLOUD_PORTAL_URL=http://localhost:3000`).
- Offline screen if the portal is unreachable; remembers window size; single instance.
- Navigation locked to `*.voidcloud.cc.cd` and localhost — other links open in your browser.

## Build locally
Prereqs: Rust stable + https://v2.tauri.app/start/prerequisites/
(Linux: `libwebkit2gtk-4.1-dev libayatana-appindicator3-dev librsvg2-dev`).

```bash
cd desktop
pnpm install
pnpm dev     # run
pnpm build   # installers in src-tauri/target/release/bundle/
```

## CI
`.github/workflows/desktop-build.yaml` builds `.msi/.exe`, `.dmg`, `.deb/.AppImage` on tag `desktop-v*` or manual run, attached to a draft release.
