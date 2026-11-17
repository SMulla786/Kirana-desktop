# Kirana-desktop — KiranaOS Windows POS

Read `../Kirana-B/CLAUDE.md` first, then `../Kirana-B/docs/` (phase plan, decisions, business rules).
This file holds only desktop notes.

- Owner rules from Kirana-B apply here:
    - Never push without the owner's OK.
    - Never add Claude co-author or "Generated with" lines to commits or PRs.
- **This repo is the Tauri 2 shell only (A-029).** The UI is kirana-F's build (`../kirana-F/dist`).
  Build every screen, including the POS, in kirana-F; don't add a React app here.
- Tokens exist only in Rust (`src-tauri/src/session.rs`):
    - The access token stays in memory; the refresh token goes in the OS credential store.
    - The webview reaches Kirana-B only through the commands in `src-tauri/src/main.rs`, which
      kirana-F's `src/api/client.ts` calls when it runs inside Tauri.
    - Never add a command that returns a token.
    - Don't grant core or plugin permissions in `src-tauri/capabilities/` without need.
- kirana-F must stay within the CSP in `src-tauri/tauri.conf.json`: no inline scripts or styles, no
  remote content or web fonts.
- Commands and the security model are in `README.md`.
