# Independent CLI release

The first release is published as `emoji-styles-cli@0.1.0`, with tag
[`cli-v0.1.0`](https://github.com/Blancochuy/emoji-styles/releases/tag/cli-v0.1.0). A manifest, merged PR or Git tag does not establish that this version
exists in npm. Verify registry metadata and installation before announcing it.
The CLI version is independent of the five renderer/data packages. MCP and the
asset pipeline remain private; pipeline code is bundled into the CLI.

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
git tag -a cli-v0.1.0 -m "Emoji Styles CLI 0.1.0" <verified-master-commit>
git push origin cli-v0.1.0
gh workflow run npm-cli-release.yml --ref cli-v0.1.0 \
  -f release_ref=cli-v0.1.0 -f auth_mode=bootstrap -f npm_tag=latest
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
npm view emoji-styles-cli@0.1.0 version dist.integrity dist.attestations --json
npm run cli:smoke -- --registry
```

Then publish GitHub release notes for `cli-v0.1.0`, linking to the npm package and
showing the explicit package/bin relationship. The package name is
`emoji-styles-cli`; its executable is `emoji-styles`. A registry invocation must
select the package explicitly, for example `npm exec --package=emoji-styles-cli@0.1.0 -- emoji-styles --help`.
Do not advertise that invocation as available until the registry verification passes.
