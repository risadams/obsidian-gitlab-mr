# Roadmap

Follow-up items from the automated plugin review (2026-09-04).

## 1. GitHub artifact attestations for release assets — done

Shipped in `.github/workflows/release.yml` (released starting with 0.1.2): the workflow
builds `main.js`/`styles.css`, attests them plus `manifest.json` with
`actions/attest-build-provenance`, and publishes them to the GitHub release. Verified with
`gh attestation verify` against the 0.1.2 release assets.

## 2. Declarative settings API (`getSettingDefinitions()`) — done

`GitlabMrSettingTab` now implements `getSettingDefinitions()` instead of the deprecated
`display()`:

- The cache-duration and toggle settings are plain `control`-based definitions, using the
  default `getControlValue`/`setControlValue` behavior (reads/writes `plugin.settings`
  directly by key).
- The accounts section is a `type: "list"` definition whose `items` are per-account
  `type: "page"` sub-pages (alias, host, default-account toggle, default project as
  declarative controls; the token field stays a `render` callback so it can keep the
  masked `<input type="password">`).
- `getControlValue`/`setControlValue` are overridden to route composite keys of the form
  `accounts.<index>.<field>` to the right account object; toggling "Default account" calls
  `this.update()` to re-render every account's mutually-exclusive toggle state.
- `minAppVersion` was raised to `1.13.0` (from `1.1.1`) since the declarative API doesn't
  exist before that, and `display()` was dropped entirely rather than kept as a
  pre-1.13.0 fallback — this plugin has no installed base yet, so there was no reason to
  carry the deprecated code path.
