# Kirana-desktop — KiranaOS Windows POS

Read `../Kirana-B/CLAUDE.md` first, then `../Kirana-B/docs/` (phase plan, decisions, business rules).
This file holds only desktop notes.

- Owner rules from Kirana-B apply here:
    - Never push without the owner's OK.
    - Never add Claude co-author or "Generated with" lines to commits or PRs.
- UI: follow `../Kirana-B/CLAUDE.md` "UI design rules":
    - The A-022 look.
    - Contrast ≥4.5:1, visible focus, 44px targets, and colour never the only signal.
    - No fake numbers.
    - Use the installed UI skills.
- Stack: Tauri 2 + React 19 + strict TS + Vite. O-4 → Tauri, owner 2026-11-16. Commands and the
  security model are in `README.md`.
- Tokens exist only in Rust (`src-tauri/src/session.rs`):
    - The access token stays in memory; the refresh token goes in the OS credential store.
    - The webview reaches Kirana-B only through the commands in `src-tauri/src/main.rs`, via
      `src/api/bridge.ts`.
    - Never add a command that returns a token.
    - Don't grant core or plugin permissions in `src-tauri/capabilities/` without need.
- Route by `me.permissions` (e.g. `pos.use`), never by role name. Kirana-B enforces.
- Copied from kirana-F (A-025): `src/styles`, `src/ui`, `src/i18n` and `src/api/types.ts`. Change both
  repos together.
