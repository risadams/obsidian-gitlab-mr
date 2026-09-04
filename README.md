# Obsidian GitLab Merge Request

Reference GitLab merge requests directly in your notes and see their live status — state, pipeline result, approvals, author — rendered as a badge that stays current.

Modeled on [obsidian-jira-issue](https://github.com/Obsidian-jira-plugin/obsidian-jira-issue): configure one or more GitLab accounts, then reference merge requests inline or in a code block.

## Setup

Open **Settings → GitLab Merge Request** and add an account:

- **Alias** — a short name used to select this account from a note (e.g. `work`)
- **Host** — your GitLab instance, e.g. `https://gitlab.com` or `https://gitlab.example.com`
- **Token** — a personal or project access token with `read_api` scope
- **Default** — toggle on for the account used when no alias is given
- **Default project** — optional `group/project`; lets you reference its merge requests as just `!123`

You can add multiple accounts for multiple GitLab instances.

## Usage

### Inline

Plain prefixed references render in both Live Preview and Reading view:

```
gitlab-mr:group/project!123
gitlab-mr:work:group/project!123
gitlab-mr:!123
gitlab-mr:work:!123
gitlab-mr:https://gitlab.example.com/group/project/-/merge_requests/123
```

Inline-code references such as `` `gitlab-mr:!123` `` continue to render in Reading view.

`!123` and `work:!123` use the resolved account's configured default project.

### Code block

````
```gitlab-mr
group/project!123
work:group/project!456
https://gitlab.example.com/group/project/-/merge_requests/789
```
````

Each reference renders as a badge showing open/merged/closed state, draft status, pipeline result, approvals, and author. Click a badge to open the merge request in your browser.

Results are cached (default 15 minutes, configurable) to avoid hammering the GitLab API; clear the cache from the settings tab at any time.

## Development

```
npm install
npm run dev     # watch build
npm run build   # type-check + production build
```
