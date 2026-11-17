# Kirana-desktop: KiranaOS Windows POS

The Windows desktop app for KiranaOS. It is a **Tauri 2 shell around the kirana-F web app**
(DECISIONS A-029): this repo holds the Rust side (window, security, login tokens); the UI, including
the POS, is kirana-F's build. One codebase serves web and desktop. Project memory and rules live in
[`../Kirana-B/CLAUDE.md`](../Kirana-B/CLAUDE.md).

## How the pieces fit

```
Kirana-desktop/src-tauri   Rust: window + guards, session (tokens), the four commands
        │ loads
kirana-F/dist              the web app (built by Tauri's beforeBuildCommand)
        │ in Tauri, src/api/client.ts calls invoke(...) instead of fetch
Kirana-B /api/v1           reached only from Rust, with Authorization: Bearer
```

`kirana-F` must sit next to this repo (`../kirana-F`).

## Setup

1. **Prerequisites (Windows):**
    - Node 24 and npm 11.
    - Rust stable ≥ 1.90 with the MSVC toolchain (`rustup default stable-msvc`).
    - Visual Studio Build Tools with the "Desktop development with C++" workload.
    - The WebView2 runtime, which Windows 11 already has.
2. Run `npm install` here and in `../kirana-F`. Lockfiles stay local (DECISIONS P-006).
3. Start Kirana-B: from `../Kirana-B`, run `npm run dev`.
4. Run `npm run dev` here. It starts kirana-F's Vite server on port 1420, builds the Rust side and
   opens the window.

## Scripts

| Script          | What it does                                                                          |
| --------------- | ------------------------------------------------------------------------------------- |
| `npm run dev`   | `tauri dev`: kirana-F's dev server on 1420 plus the desktop window                    |
| `npm run build` | `tauri build --no-bundle`: builds kirana-F, then the release exe in `src-tauri/target/release` |
| `npm test`      | `cargo test`: session, refresh-once, token-stripping and navigation-guard unit tests  |

UI tests live in kirana-F (`npm test` there), including `src/api/desktop.test.ts` for the IPC
transport.

## Environment

| Variable         | Default                         | Read by                        |
| ---------------- | ------------------------------- | ------------------------------ |
| `KIRANA_API_URL` | `http://localhost:4800/api/v1`  | The Rust side, once at startup |

Example (PowerShell): `$env:KIRANA_API_URL = 'https://api.example.in/api/v1'; npm run dev`.
Never put credentials in env files or code.

## Security model

- **Tokens:** the Rust side owns them (`src-tauri/src/session.rs`).
    - The access token lives only in memory.
    - The refresh token goes in the OS credential store via the `keyring` crate (Windows Credential
      Manager, entry "KiranaOS Desktop" / "refresh-token").
    - The webview never receives either. Every reply has `accessToken`/`refreshToken` removed.
- **The webview's only IPC** is four commands (`src-tauri/src/main.rs`), called from kirana-F's
  `src/api/client.ts` when it detects Tauri:

    | Command                             | What it does                                                                                     |
    | ----------------------------------- | ------------------------------------------------------------------------------------------------ |
    | `login(identifier, password, kiranaId?)` | Sends `deviceName: "Desktop POS"`. A 409 passes the business list through.                  |
    | `restore_session`                   | Refreshes from the stored token, then calls `GET /auth/me`.                                      |
    | `logout`                            | Calls `POST /auth/logout` with the refresh token, then clears memory and the store, even offline. |
    | `api_request(method, path, body)`   | Adds `Authorization: Bearer`, refreshes once on a 401 and retries once.                          |

- **`api_request` limits:**
    - Allowed methods: GET, POST, PUT, PATCH and DELETE.
    - Paths must be plain `/…` routes: no `%`, `..` or `//`.
    - It refuses the token routes (`/auth/login|refresh|logout`).
- **Refresh:**
    - It is single-flight, because Kirana-B rotates refresh tokens and revokes a session when one is
      reused.
    - A rejected refresh (400/401/403) ends the session. A network failure keeps it.
- **Capabilities:** `src-tauri/capabilities/main.json` grants no core or plugin permissions. There is
  no shell, fs, http, window or event API in the webview.
- **CSP:**
    - The built app runs under `default-src 'none'; script-src 'self'; style-src 'self'; connect-src
      ipc: http://ipc.localhost; …`. Tauri adds its own hashes and nonces.
    - kirana-F's build was checked against it: no inline scripts or styles, no remote content, no web
      fonts.
    - `tauri dev` loads the Vite server directly, so the CSP only applies to built assets.
- **Navigation:**
    - The window is built in Rust with `on_navigation` limited to the app's own origin (plus the Vite
      server on 1420 in debug builds).
    - `window.open` is denied.
- **Routing:** the desktop runs the full kirana-F app. Each role lands where it does on the web (a
  cashier on `/pos`). Kirana-B enforces every permission.

## Known gaps

- **Rust has not been compiled yet.** The machine that built this had no Rust/MSVC toolchain, so
  `cargo test`, `tauri dev` and `tauri build` have never run. Expect a first-compile fix or two.
  `Cargo.lock` doesn't exist yet; commit it after the first build (it's an app).
- **Build coupling:** `npm run build` builds whatever is checked out in `../kirana-F`. A release must
  record both commits.
- **Abort:** requests over IPC can't be cancelled (`AbortSignal` is ignored on desktop).
- **Credential store fallback:** if the store is unavailable, the session lasts until the app closes
  (logged, not yet shown in the UI).
- **Logout offline:** it clears the device, but the server session lives until it expires.
- **Not done yet:** offline billing, sync, printers, scanners, cash drawer, scales, installer and
  auto-update (Phases 4 and 9). There is no cashier PIN or device registration (A-018 deferred).
- **Bundle identifier** `in.kiranaos.desktop` is a placeholder. Confirm it before packaging, because
  it decides the app-data folder.
- **Duplicate business names** look the same in the 409 picker; Kirana-B returns only `{id, name}`.
