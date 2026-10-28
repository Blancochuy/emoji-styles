# Emoji Styles CLI

Inspect and normalize local emoji images, validate custom providers, audit source
code, and work interactively in Studio. The image pipeline is included in the
build; installing the CLI does not require private workspace packages.

## Distribution

CLI versions are released independently of the renderer/data packages. Consult
[CLI releases](https://github.com/Blancochuy/emoji-styles/releases) and the
[release guide](https://github.com/Blancochuy/emoji-styles/blob/master/docs/CLI_RELEASE.md)
for verified published versions. The first release is prepared as `0.1.0`;
removing the private guard does not itself publish a version to npm.

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
npm install --save-dev /absolute/path/to/emoji-styles-cli-0.1.0.tgz
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

Project checks include `init`, `doctor`, `audit`, `fix`, `test`, `sync`, and `licenses`.
Provider packaging requires truthful provenance and uses `assets build`; it does
not generate artwork, infer ownership, call an image model, or spend credits.

[Full CLI guide](https://github.com/Blancochuy/emoji-styles/blob/master/docs/CLI.md)
· [Custom assets](https://github.com/Blancochuy/emoji-styles/blob/master/docs/CUSTOM_ASSETS.md)
· [Issues](https://github.com/Blancochuy/emoji-styles/issues)

MIT licensed. Bundled pipeline code belongs to the same project; installed external
dependencies retain their own licenses.
