# Emoji Styles CLI

Inspect and normalize local emoji images, validate custom providers, audit source
code, and work interactively in Studio. The image pipeline is included in the
build; installing the CLI does not require private workspace packages.

## Installation

The package is `emoji-styles-cli`; its executable is `emoji-styles`.

```sh
npm install --save-dev emoji-styles-cli
npx --no-install emoji-styles --help
npx --no-install emoji-styles studio ./raw ./emoji-assets
```

CLI versions are released independently of the renderer/data packages. See the
[releases](https://github.com/Blancochuy/emoji-styles/releases)
and [release guide](https://github.com/Blancochuy/emoji-styles/blob/master/docs/CLI_RELEASE.md).

For your own images, follow the [custom-pack quickstart](https://github.com/Blancochuy/emoji-styles/blob/master/docs/QUICKSTART.md).
Portable packaging and `assets init` require **CLI 0.1.1 or newer**. Version 0.1.0
omits image copies when building a pack. Check `npm ls emoji-styles-cli` to see
your installed version. Source builds must pass the artifact checks below.

```sh
npx --no-install emoji-styles assets init ./artwork --no-generated --yes
```

Review the editable provenance, then normalize your images and build the pack.
`assets build` copies them into `<output>/assets`, and checks existing files before
writing. No image-generation model is called by these commands.

## Verify a source build

To verify the installable development artifact from a repository checkout:

```sh
pnpm install --frozen-lockfile
pnpm cli:pack
npm run cli:smoke
```

The smoke check installs the tarball into a clean temporary npm project, exercises
its binary and native image operations, and removes the temporary project.

To try it in your own project, install the tarball produced in `.release-cli/`:

```sh
npm install --save-dev /absolute/path/to/emoji-styles-cli-0.2.0.tgz
npx --no-install emoji-styles --help
npx --no-install emoji-styles studio ./raw ./emoji-assets
```

The declared Node range is `^18.17.0 || ^20.3.0 || >=21.0.0`, matching sharp.
CI checks the minimum release on Linux and Node 22/24
on Linux, macOS and Windows, plus Node 20 on Linux. Native image support is supplied
by sharp 0.34.3. Keep optional dependencies enabled during installation. The
interactive interface needs a TTY; automated jobs use the asset commands and JSON.
See [sharp installation](https://sharp.pixelplumbing.com/install/) for platform and
native-library requirements. CI validates packaged commands, headless Studio routing, and opening/cancellation
with a simulated TTY. It does not establish compatibility with every terminal application.

## Local image workflow

```sh
npx --no-install emoji-styles assets inspect ./raw --json
npx --no-install emoji-styles assets normalize ./raw ./emoji-assets --format webp
npx --no-install emoji-styles assets normalize ./raw ./emoji-assets --format webp --yes
npx --no-install emoji-styles assets validate ./emoji-assets --format webp --json
npx --no-install emoji-styles assets contact-sheet ./emoji-assets ./review.png --review --yes
```

Commands preview writes unless `--yes` is supplied. Studio presents its own explicit
write confirmation and refuses overwrites. Existing real transparency is preserved;
normalization does not remove an opaque background. Technical validation is separate
from visual review at 24/48 px on light and dark backgrounds.

For scripts, `--json` produces a result envelope. Exit codes are 0 for success,
1 for an operation/check failure and 2 for invalid usage. `studio` refuses pipes
and JSON mode; `studio --help --json` remains available to agents.

`assets pack` (CLI 0.1.2+) normalizes, validates and packages in one step,
with the image origin as flags. Version 0.1.2 is published on npm; upgrade from
CLI 0.1.1 to use this command:

```sh
npx --no-install emoji-styles assets pack ./raw ./public/emoji/product --id product --no-generated --source "My illustrations" --ownership "Your name" --manifest-out ./src/emoji-provider.json --yes
```

Project checks include `init`, `doctor`, `audit`, `fix`, `test`, `sync`, and `licenses`.
Provider packaging requires truthful provenance and uses `assets build` or `assets pack`; it does
not generate artwork, infer ownership, call an image model, or spend credits.

[Full CLI guide](https://github.com/Blancochuy/emoji-styles/blob/master/docs/CLI.md)
· [Custom assets](https://github.com/Blancochuy/emoji-styles/blob/master/docs/CUSTOM_ASSETS.md)
· [Issues](https://github.com/Blancochuy/emoji-styles/issues)

MIT licensed. Bundled pipeline code belongs to the same project; installed external
dependencies retain their own licenses.

### Design review from existing UI (CLI 0.2.0)

CLI 0.2.0 includes role/evidence inventory in `audit` and `theme draft [path]`
to propose `emoji-theme.ts`, `review.json` and a 16/20/24 px light/dark comparison
sheet. Preview first, then use `--yes`. Earlier CLI versions do not include this workflow.
See [the workflow and limitations](https://github.com/Blancochuy/emoji-styles/blob/master/docs/CLI.md#from-an-audit-to-a-design-draft-cli-020).
