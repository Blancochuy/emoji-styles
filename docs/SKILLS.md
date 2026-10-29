# Agent skills

Three portable `SKILL.md` packages guide integration and artwork workflows:

| Skill | Use it for |
| --- | --- |
| `emoji-styles` | Configure, audit and integrate providers, fallback and semantic themes |
| `emoji-asset-creator` | Plan original artwork or inspect, pack and review existing images |
| `emoji-isometric-style` | Plan and review an original isometric emoji set (the friendly product-isometric genre); packs through `emoji-asset-creator` |

They run the **published CLI 0.3.3+ in your app**. No Emoji Styles checkout,
monorepo build, private package or Python wrapper is needed to use them.
Image generation uses your agent's available authorized tool; the CLI never
executes an image model. Skills do not grant generation or publication permission.

## Install the complete skill folders

Copy each whole directory from `skills/`, including its `references/`, `assets/`
and optional host metadata, into the destination for your agent:

| Agent | Project destination | Invoke |
| --- | --- | --- |
| Codex | `.agents/skills/<skill>/` | `$emoji-styles`, `$emoji-asset-creator`, `$emoji-isometric-style` |
| Claude Code | `.claude/skills/<skill>/` | `/emoji-styles`, `/emoji-asset-creator`, `/emoji-isometric-style` |
| Cursor | `.cursor/skills/<skill>/` | Select the skill in Agent's `/` menu or request it by name |

Directory locations follow [Codex](https://learn.chatgpt.com/docs/build-skills),
[Claude Code](https://code.claude.com/docs/en/skills) and
[Cursor](https://cursor.com/docs/skills) documentation. Availability can depend on
host version and workspace policy. Reopen the session if a newly copied skill
is not discovered. `agents/openai.yaml` is optional Codex UI metadata, not a
runtime dependency for other hosts.

For example, on macOS/Linux, fetch only the reusable skill sources into a
separate directory, then copy them into your app. Use a new download directory;
inspect existing destination skills before deliberately replacing them:

```sh
git clone --depth 1 --filter=blob:none --sparse --branch master https://github.com/Blancochuy/emoji-styles.git /tmp/emoji-styles-skills
git -C /tmp/emoji-styles-skills sparse-checkout set skills
```

From **your app's root**, for Codex:

```sh
mkdir -p .agents/skills
cp -R /tmp/emoji-styles-skills/skills/emoji-styles /tmp/emoji-styles-skills/skills/emoji-asset-creator /tmp/emoji-styles-skills/skills/emoji-isometric-style .agents/skills/
```

Use `.claude/skills` or `.cursor/skills` instead for those hosts. On Windows,
copy the same complete folders using your file manager or PowerShell. For a
reproducible installation, select a reviewed commit/tag instead of following
master. The temporary download is not a build/runtime dependency of your app.

If Codex's `skill-installer` is available, you can instead ask it to install
`skills/emoji-styles`, `skills/emoji-asset-creator` and `skills/emoji-isometric-style` from
`Blancochuy/emoji-styles`, **ref `master`** (or a reviewed commit). Its generic
default ref is `main`, which this repository does not use. It may need Python
for installation; running these two skills does not. This optional installer
path does not apply to Claude Code or Cursor.

## Run from the target app

Use the app's package manager. For npm:

```sh
npm install --save-dev emoji-styles-cli@0.3.3
npx --no-install emoji-styles --help
```

`emoji-styles-cli` is the package; `emoji-styles` is its executable. `--no-install`
selects the existing local binary instead of silently downloading another
package. With pnpm, use `pnpm exec emoji-styles`. Install the appropriate public
renderer (`emoji-styles`, `react-emoji-styles` or `emoji-styles-web`) when integrating
runtime output. See the [quickstart](./QUICKSTART.md) and [CLI guide](./CLI.md).

Ask the agent to use the installed skill to audit the current app or package your
images. References/templates are relative to the **installed skill directory**;
all CLI inputs/outputs are relative to the **app root**. Old Python wrappers have
been removed; replace calls to `run_audit.py`, `validate_project.py` or asset
wrappers with their direct `npx --no-install emoji-styles` commands.

## Verified scope and limitations

The portable consumer check copies the skill folders outside the repository,
installs CLI 0.3.3 and runtime 0.3.1 from npm, and executes their actual CLI examples in a clean app.
It exercises config preview/apply, read-only audit/doctor/test, spec validation,
no-spend planning (including the isometric template), asset inspection, pack preview/apply, manifest copies, real
asset hashes, the review sheet and theme compilation. No private runtime package, Python wrapper or
monorepo build is used in that app.

This is deterministic command-flow validation. It does not establish skill
discovery or model behavior inside all three hosts, visual quality, participant
completion time, or successful image generation. Host-specific installation
instructions are documentation-backed, not a claim of three independent agent runs.

The audit inventories roles and accessibility evidence; `theme draft` proposes
reviewable tokens and comparison sheets. Neither approves product meanings nor
fixes source automatically. For a reviewed closed set, the skills now route to
`theme compile` and the framework's compiled entry: React or `emoji-styles-web/compiled`.
Draft TypeScript loading needs
Node 22.18+; JSON or executable MJS works on older supported versions. The
consumer check runs on Node 24 and verifies preview/write/freshness, compiles
custom artwork, server-renders it with the web entry and builds catalog-free
React and plain-web browser entries. Keep the full renderer
for dynamic Unicode and measure the actual import graph before claiming savings.

## Maintainer checks

```sh
python3 /path/to/skill-creator/scripts/quick_validate.py skills/emoji-styles
python3 /path/to/skill-creator/scripts/quick_validate.py skills/emoji-asset-creator
python3 /path/to/skill-creator/scripts/quick_validate.py skills/emoji-isometric-style
pnpm --filter emoji-styles-scripts test
npm run skills:smoke
```

Python is only used by the optional authoring validator above. The external
consumer check runs in CI separately from unit tests and requires network access
to install published npm packages. Repository `.agents/skills` symlinks retain
local discovery without copying the skill sources.
