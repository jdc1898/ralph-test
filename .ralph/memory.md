## #20 Update Documentation

- `CLAUDE.md` lives at the repo root (`/Users/davidchurch/Herd/Ralph/CLAUDE.md`), not inside `server/` — the working directory is `server/`, so root-level files require an absolute path with the parent directory.
- `.claude/settings.json` also lives at the repo root (`/Users/davidchurch/Herd/Ralph/.claude/settings.json`), not under `server/`.
- The monorepo splits into at least `server/` (Node.js backend) and `client/` (Vue frontend) under the Ralph root.
- Contributor documentation lives in a `README.md` at the repo root; the Contributors section is maintained there, not in any server- or client-specific docs.
- `prd/backlog/` (under the repo root) holds PRD files named `<owner>-<repo>-<issue-number>/`; this is where agent work items are tracked.