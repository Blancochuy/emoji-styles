# Independent CLI release

The first release is published as `emoji-styles-cli@0.1.0`, with tag
[`cli-v0.1.0`](https://github.com/Blancochuy/emoji-styles/releases/tag/cli-v0.1.0). A manifest, merged PR or Git tag does not establish that this version
exists in npm. Verify registry metadata and installation before announcing it.
The CLI version is independent of the five renderer/data packages. The MCP is independently published; the asset pipeline remains private and its code is bundled into the CLI.

CLI **0.1.1** is published with the portable-pack fix, `assets init`, actual
schema output and newcomer documentation. The [publication workflow](https://github.com/Blancochuy/emoji-styles/actions/runs/40627495315) verified registry integrity, provenance, latest and a clean registry installation.
Browser-authorized publication completed after OIDC attempts returned ENEEDAUTH;
OIDC configuration remains to be diagnosed before the next automated release. The MCP keeps its pinned
published CLI 0.1.0 dependency while this independent CLI release is prepared;
its read-only audit API is unchanged.

## CLI 0.1.2 publication

CLI **0.1.2** is published with `assets pack`, inferred public URLs, manifest
copies, compact review sheets and output-collision protection. The
[publication workflow](https://github.com/Blancochuy/emoji-styles/actions/runs/40634811331)
verified registry integrity, provenance, latest and installation. Publication used
the existing browser-authorized `bootstrap` mode; the earlier OIDC issue remains
unresolved. The MCP retains its published CLI dependency and was not released.

## CLI 0.2.0 publication

CLI **0.2.0** is published with the source-audit role inventory and `theme draft` workflow.
It adds light/dark provider comparisons at 16, 20 and 24 px and custom raster-pack
review. It deliberately removes automatic CLDR button labels: authors must name
an action rather than inherit the glyph's name. Semantic proposals still require
review; this release does not reduce the Unicode bundle or release the MCP.

The [publication workflow](https://github.com/Blancochuy/emoji-styles/actions/runs/40734253875)
verified registry integrity, provenance, latest and a clean registry installation,
including the full design workflow and a generated theme imported with the public
core package. Publication used the browser-authorized mode; OIDC remains unresolved.

## CLI 0.2.1 publication

CLI **0.2.1** is published with the merged draft-quality refinements from #55 and #56:
compact 20 px provider matrices, normalized diacritics, explicit wording/glyph
conflicts and canonical status review. Unresolved status rows remain visible in
the report and sheet but are omitted from the exported theme. Generic state
labels still require localization/review, and competing/conflicting evidence is
handled conservatively. This release does not change renderer/data or MCP versions.

The [publication workflow](https://github.com/Blancochuy/emoji-styles/actions/runs/40752965777)
verified registry integrity, provenance, latest and clean installation, including
the complete design workflow. Publication used browser authorization; OIDC remains unresolved.

## Release order for core-dependent commands

`theme compile` needs `compileEmojiTheme` from `emoji-styles`, which the published
0.1.1 core does not export. The CLI loads it only for that command, so an older
installed core fails `theme compile` with an upgrade message while every other
command keeps working. To ship the feature:

1. Publish `emoji-styles` and `react-emoji-styles` with the compiler and the
   `compiled` entries first (planned 0.2.0), and verify them in the registry.
2. Then release the CLI with `"emoji-styles": "^0.2.0"`. `workspace:*` packs the
   core version present at pack time; never pack a CLI that requires an unpublished core.
3. Announce `theme compile` only after both are installable from npm.

## Validate the release candidate

```sh
pnpm test
pnpm typecheck
pnpm cli:pack
npm run cli:smoke
```

Merge the release PR after CI is green. Tag the verified master commit and push
only that tag. Dispatch the workflow **from the same tag**, so GitHub's workflow
identity, checkout and provenance all refer to the tested source:

```sh
git tag -a cli-v0.2.1 -m "Emoji Styles CLI 0.2.1" <verified-master-commit>
git push origin cli-v0.2.1
gh workflow run npm-cli-release.yml --ref cli-v0.2.1 \
  -f release_ref=cli-v0.2.1 -f auth_mode=bootstrap -f npm_tag=latest
```

The workflow rejects a branch, a renderer tag, a tag/version mismatch, a private
manifest, a commit outside master, or a workflow running from another source ref.
After verification, jobs check out the resolved commit SHA. The workflow reruns
tests/types and the eight-platform/runtime installation checks using one tarball.
Publication waits for those jobs and approval of the existing `npm` environment.

The `npm` environment must also allow the selected CLI tag with deployment-policy
type `tag`. Initial setup allowed the exact `cli-v0.1.0` tag alongside the existing
`master` branch rule. Permit each new CLI release tag before dispatching it;
required reviewer approval remains in place.

## First publication: browser-authorized bootstrap

A brand-new package has no trusted publishing relationship. Use the explicit
`bootstrap` mode once. On the ephemeral GitHub runner, `npm login --auth-type=web`
prints a link. Open it yourself and authorize the npm session. The account must
be `blancochuy`; the workflow rejects other accounts. npm may print a second web
challenge for publication. Complete that 2FA approval when requested.

No password, OTP or token needs to be pasted into chat or saved as a GitHub secret.
The browser session configuration lives in `runner.temp` and is removed by an
always-run cleanup step. The runner is discarded after the job. This is an
explicit first-publication mode, not an automatic fallback from failed OIDC.

The exact tested tarball is published with public access and provenance. The
workflow verifies registry bytes, repository metadata, the provenance field and
the selected dist-tag, then installs the exact version from the public registry
and repeats the native-image and packaged Studio smoke checks.

See [npm browser login](https://docs.npmjs.com/cli/v11/commands/npm-login/) and
[npm provenance](https://docs.npmjs.com/generating-provenance-statements/) for the
underlying authentication and attestation requirements.

## Subsequent releases: trusted publishing

For the next release, configure a GitHub Actions trusted publisher on
[the CLI package access page](https://www.npmjs.com/package/emoji-styles-cli/access):

- Organization/user: `Blancochuy` (case-sensitive).
- Repository: `emoji-styles`.
- Workflow filename: `npm-cli-release.yml`.
- Environment: `npm`.
- Allow direct `npm publish`. Dist-tag management is not needed.

Use `auth_mode=oidc` for subsequent CLI tags. It never calls login or uses an npm
token secret. Keep this publisher separate from `npm-release.yml`, which releases
the five renderer packages.

Create the trust configuration close to the next actual OIDC publication. npm
requires its first successful publish within two days; an integrity-only retry
that skips an already-published version does not validate a new trust connection.
Do not create a connection and leave it unused while waiting for a future release.
See [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/).

## Retries and final verification

An existing version is accepted only if its SHA-512 integrity matches the tested
tarball and it has provenance. Different bytes or a missing attestation stop the
release. Registry outages are not interpreted as absent packages. No automatic
unpublish, overwrite or dist-tag repair is performed.

npm may accept an upload before registry installation metadata becomes visible.
Verification allows up to five minutes of propagation, logs its progress, and never
repeats the upload during that wait. A short-lived `0.0.0-stage` placeholder can
appear while a brand-new package is being processed; it is not the requested release.

If a publish result is unknown, inspect npm first, then rerun the same immutable
tag. Matching published bytes are verified instead of republished. A tag mismatch
requires a deliberate maintainer decision rather than a broader trust permission.

After the workflow succeeds:

```sh
npm view emoji-styles-cli@0.2.1 version dist.integrity dist.attestations --json
npm run cli:smoke -- --registry
```

Then publish GitHub release notes for `cli-v0.2.1`, linking to the npm package and
showing the explicit package/bin relationship. The package name is
`emoji-styles-cli`; its executable is `emoji-styles`. A registry invocation must
select the package explicitly, for example `npm exec --package=emoji-styles-cli@0.2.1 -- emoji-styles --help`.
Do not advertise that invocation as available until the registry verification passes.
