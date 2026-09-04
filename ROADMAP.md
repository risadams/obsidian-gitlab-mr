# Roadmap

Follow-up items from the automated plugin review (2026-09-04) that weren't part of the
initial fix pass.

## 1. GitHub artifact attestations for release assets

**Goal:** cryptographically prove `main.js` and `styles.css` were built from this repo's
source, using GitHub's Sigstore-backed build provenance attestations.

- Confirm how releases are currently cut (manual vs. existing CI) — there is no
  `.github/workflows/release.yml` yet.
- Add a release workflow triggered on tag push (e.g. `v*`) that:
  1. Checks out the repo, installs deps, runs `npm run build` to produce `main.js` /
     `styles.css`.
  2. Grants `id-token: write` and `attestations: write` permissions.
  3. Calls `actions/attest-build-provenance@v1` with
     `subject-path: 'main.js,styles.css,manifest.json'`.
  4. Uploads those files to the GitHub Release (`softprops/action-gh-release` or
     `gh release upload`).
- Verify with `gh attestation verify main.js --repo risadams/obsidian-gitlab-mr` after the
  next tagged release.
- No extra secrets needed — attestation uses the workflow's own OIDC token.

## 2. Declarative settings API (`getSettingDefinitions()`)

**Goal:** make settings searchable in Obsidian ≥1.13.0 and move off the deprecated
imperative `display()` pattern.

- Structural rewrite — do as its own PR, not a quick patch.
- Steps:
  1. Read Obsidian's `SettingDefinitionItem` / `getSettingDefinitions()` typings
     (`obsidian.d.ts` ~line 6143–6600) to learn the declarative shape (groups, items,
     nested pages for the account list).
  2. Model each current `display()` block as a `SettingDefinitionItem`: cache duration,
     the four toggles, and the accounts section.
  3. The accounts list is dynamic (add/remove/reorder) — check whether the declarative
     API supports dynamic children, or whether that section must stay imperative
     (fallback: keep `display()` for the accounts sub-UI, migrate the static toggles to
     `getSettingDefinitions()`).
  4. Keep `display()` implemented too (even delegating to the same rendering logic),
     since `minAppVersion` is 1.1.1, well below 1.13.0, and older Obsidian versions still
     call `display()`.
  5. Test in Obsidian's settings search to confirm the new items are indexed.
- Only worth doing once we're ready to decide whether to raise `minAppVersion` further,
  since the declarative API only pays off for users already on ≥1.13.0.
