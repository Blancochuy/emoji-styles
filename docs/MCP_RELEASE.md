# Independent MCP release

The first release is published as `emoji-styles-mcp@0.1.0`, with tag
[`mcp-v0.1.0`](https://github.com/Blancochuy/emoji-styles/releases/tag/mcp-v0.1.0). A manifest, merged PR or Git tag does not establish that this version
exists in npm. Verify registry metadata and installation before announcing it.
The MCP version is independent of the five renderer/data packages and the CLI. The asset pipeline remains private and is bundled into the MCP. The MCP depends
on the published CLI.

## Validate the release candidate

```sh
pnpm test
pnpm typecheck
pnpm mcp:pack
npm run mcp:smoke
```

Merge the release PR after CI is green. Tag the verified master commit and push
only that tag. Dispatch the workflow **from the same tag**, so GitHub's workflow
identity, checkout and provenance all refer to the tested source:

```sh
git tag -a mcp-v0.1.0 -m "Emoji Styles MCP 0.1.0" <verified-master-commit>
git push origin mcp-v0.1.0
gh workflow run npm-mcp-release.yml --ref mcp-v0.1.0 \
  -f release_ref=mcp-v0.1.0 -f auth_mode=bootstrap -f npm_tag=latest
```

The workflow rejects a branch, a renderer tag, a tag/version mismatch, a private
manifest, a commit outside master, or a workflow running from another source ref.
After verification, jobs check out the resolved commit SHA. The workflow reruns
tests/types and the eight-platform/runtime installation checks using one tarball.
Publication waits for those jobs and approval of the existing `npm` environment.

The `npm` environment must also allow the selected MCP tag with deployment-policy
type `tag`. Add the exact `mcp-v0.1.0` tag alongside existing release rules. Permit each new MCP release tag before dispatching it;
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
[the MCP package access page](https://www.npmjs.com/package/emoji-styles-mcp/access):

- Organization/user: `Blancochuy` (case-sensitive).
- Repository: `emoji-styles`.
- Workflow filename: `npm-mcp-release.yml`.
- Environment: `npm`.
- Allow direct `npm publish`. Dist-tag management is not needed.

Use `auth_mode=oidc` for subsequent MCP tags. It never calls login or uses an npm
token secret. Keep this publisher separate from `npm-release.yml`, which releases
the five renderer packages. CLI releases keep using `npm-cli-release.yml`.

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
npm view emoji-styles-mcp@0.1.0 version dist.integrity dist.attestations --json
npm run mcp:smoke -- --registry
```

Then publish GitHub release notes for `mcp-v0.1.0`, linking to the npm package and
showing the explicit package/bin relationship. The package name and executable are both `emoji-styles-mcp`. A registry invocation must
select the package explicitly, for example `npm exec --package=emoji-styles-mcp@0.1.0 -- emoji-styles-mcp --help`.
Do not advertise that invocation as available until the registry verification passes.
