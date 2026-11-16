# Kirana-desktop: KiranaOS Windows POS

Phase 1 placeholder shell for the KiranaOS desktop till. It does sign-in, session restore,
permission-based routing and logout against the [Kirana-B](../Kirana-B) API. Billing itself arrives
later (Phase 3 web POS, then offline desktop billing in Phase 9; DECISIONS A-023).

**Stack:** Tauri 2 (Rust) + React 19 + TypeScript (strict) + Vite. The owner chose Tauri over Electron
on 2026-11-16, which settles the stack question in DECISIONS O-4. Project memory and rules live in
[`../Kirana-B/CLAUDE.md`](../Kirana-B/CLAUDE.md).

## Setup

1. **Prerequisites (Windows):**
    - Node 24 and npm 11.
    - Rust stable ≥ 1.90 with the MSVC toolchain (`rustup default stable-msvc`).
    - Visual Studio Build Tools with the "Desktop development with C++" workload.
    - The WebView2 runtime, which Windows 11 already has.
2. Run `npm install`. The lockfile stays local, as in Kirana-B and kirana-F (DECISIONS P-006).
3. Start Kirana-B: from `../Kirana-B`, run `npm run dev`.
4. Run `npm run dev`. This starts Vite on port 1420, builds the Rust side and opens the window.

## Scripts

| Script               | What it does                                                                 | Needs Rust |
| -------------------- | ---------------------------------------------------------------------------- | ---------- |
| `npm run dev`        | `tauri dev`: Vite dev server plus the desktop window                         | yes        |
| `npm run build`      | `tauri build --no-bundle`: release exe in `src-tauri/target/release`, no installer | yes   |
| `npm run typecheck`  | `tsc` (strict) over `src`                                                    | no         |
| `npm test`           | Vitest + Testing Library (the Tauri `invoke` is mocked)                      | no         |
| `npm run test:rust`  | `cargo test`: session, refresh-once and navigation-guard unit tests          | yes        |
| `npm run build:web`  | `tsc && vite build` into `dist/` (Tauri runs this before `build`)            | no         |
| `npm run dev:web`    | Vite only (Tauri runs this before `dev`)                                     | no         |

## Environment

| Variable         | Default                         | Read by                                    |
| ---------------- | ------------------------------- | ------------------------------------------ |
| `KIRANA_API_URL` | `http://localhost:4800/api/v1`  | The Rust side, once at startup              |

Example (PowerShell): `$env:KIRANA_API_URL = 'https://api.example.in/api/v1'; npm run dev`.
Never put credentials in env files or code.

## Security model

- **Tokens:** the Rust side owns them (`src-tauri/src/session.rs`).
    - The access token lives only in memory.
    - The refresh token goes in the OS credential store via the `keyring` crate (Windows Credential
      Manager, entry "KiranaOS Desktop" / "refresh-token").
    - The webview never receives either. Every reply has `accessToken`/`refreshToken` removed.
- **The webview's only IPC** is four commands (`src-tauri/src/main.rs`), wrapped by
  `src/api/bridge.ts`:

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
  no shell, fs, http, window or event API in the webview. Tauri allows the app's own commands only for
  local app content.
- **CSP:**
    - The built app runs under `default-src 'none'; script-src 'self'; style-src 'self'; connect-src
      ipc: http://ipc.localhost; …`. Tauri adds its own hashes and nonces.
    - It loads no remote content and no web fonts.
    - `tauri dev` loads the Vite server directly, so the CSP only applies to built assets.
- **Navigation:**
    - The window is built in Rust with `on_navigation` limited to the app's own origin (plus the Vite
      server in debug builds).
    - `window.open` is denied.
- **Routing:**
    - It goes by `me.permissions`, never by role name. `pos.use` opens the POS workspace. Without it,
      the device shows "This device is for billing" and a logout button.
    - The UI only picks the screen; Kirana-B enforces permissions.

## Layout

```
src/                  React app (webview)
  api/bridge.ts       Tauri command wrappers, ApiError
  auth/               AuthProvider: restore on start, login, logout
  screens/            Login (+409 business picker), PosWorkspace, NoPosAccess, Splash
  ui/  styles/  i18n/ Copied from kirana-F (see gaps)
src-tauri/            Rust: main.rs (window, guards, commands), session.rs (tokens, HTTP, refresh)
  capabilities/       Permission grants (none)
app-icon.svg          Icon source: `npx tauri icon app-icon.svg`, then keep only the files tauri.conf.json lists
```

## Known gaps

- **Rust has not been compiled yet.** The machine that built this shell had no Rust/MSVC toolchain,
  so `cargo check`, `cargo test`, `tauri dev` and `tauri build` have never run. Expect a first-compile
  fix or two. `Cargo.lock` doesn't exist yet; commit it after the first build (it's an app).
- **Code is duplicated from kirana-F** (A-025, no shared package): `src/styles/tokens.css`, parts of
  `global.css` and `ui.css`, the UI components, the i18n setup and the shared en/hi/mr wording.
  `src/api/types.ts` is hand-copied from kirana-F's generated OpenAPI types. Change both repos
  together until a shared package or generator exists.
- **Hindi and Marathi strings are machine-drafted** and need native-speaker review (A-024).
- **Backend error messages are English.** The login screen maps statuses to its own translated
  messages, so server wording is never shown.
- **Credential store fallback:** if the store is unavailable, the session lasts until the app closes
  (logged, not yet shown in the UI).
- **Logout offline:** an offline logout clears the device, but the server session lives until it
  expires.
- **Not done in Phase 1:** offline billing, sync, printers, scanners, cash drawer, scales, installer
  and auto-update (Phases 4 and 9). There is also no cashier PIN login or device registration
  (A-018 deferred).
- **Bundle identifier** `in.kiranaos.desktop` is a placeholder. Confirm it before packaging, because
  it decides the app-data folder.
- **Duplicate business names:** two businesses with the same name can't be told apart in the 409
  picker. Kirana-B returns only `{id, name}`.
- **Prettier:** formatting follows kirana-F's `.prettierrc`, but Prettier isn't a dependency here.
