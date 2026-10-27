# Release process

Emoji Styles publishes five public npm packages from one verified version:

1. `emoji-styles-data`
2. `emoji-styles`
3. `react-emoji-styles`
4. `emoji-styles-web`
5. `emoji-styles-assets-twemoji`

The order is intentional because later packages depend on earlier packages.
CLI, MCP, asset-pipeline, GitHub Action source, fixtures, scripts, and the demo
remain private workspace packages.

## Prerequisites

- An npm account with two-factor authentication enabled.
- Publication access to the existing packages, with Trusted Publishing configured
  for this repository and workflow. The core and React packages are already
  published at v0.1.0; check all five registry versions before choosing a new version.
- A protected GitHub environment named `npm`.
- A clean `master` commit with all required checks passing.

Trusted Publishing uses GitHub's short-lived OIDC identity. All five public
package names already exist. The release workflow intentionally has no npm token
secret or local-auth fallback.

## Configure the existing packages once

In each package's npm settings, verify a GitHub Actions trusted publisher with:

- Organization/user: `Blancochuy` (case-sensitive).
- Repository: `emoji-styles`.
- Workflow filename: `npm-release.yml` (filename only).
- Environment: `npm`.
- Allowed action: direct `npm publish`, matching this workflow.

The account owner must configure this relationship in npm. An approval in GitHub's
`npm` environment does not establish npm trust by itself. npm does not validate
these fields when saving them; a successful publish verifies the configuration.
New configurations must complete their first successful publish within two days.
See [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/).

The workflow uses Node 24 and a current npm CLI, `id-token: write`, a GitHub-hosted
runner and the protected `npm` environment. Do not add `registry-url` to the
`setup-node` step or a `NODE_AUTH_TOKEN` placeholder: that writes token-auth config
which can interfere with automatic OIDC authentication. Publish commands use the
default npm registry and verified tarballs.

If publishing fails with `ENEEDAUTH`, check the exact publisher fields, expiry
and allowed action in npm before rerunning. `npm whoami` does not test OIDC
permissions. Do not solve the error by disabling provenance or weakening the
GitHub environment. A new, unpublished package needs a separate maintainer-led
bootstrap; this existing-package workflow does not create or store bootstrap tokens.

## Validate locally

```bash
pnpm install --frozen-lockfile
pnpm release:check
```

The release check runs the monorepo tests, type checking, asset verification,
and production builds. It then creates all five tarballs, verifies package
metadata and contents, confirms workspace dependency ranges were replaced, and
installs every tarball into a clean temporary npm consumer before importing all
public JavaScript entry points.

Generated tarballs are written to `.release/` and are intentionally ignored by
Git.

## Publish the next version

1. Choose an unused version and update all five public package versions and
   internal dependency ranges together. Validate the release PR and merge it
   after CI is green. Never republish v0.1.0.
2. Create the signed or annotated tag `vX.Y.Z` from the verified `master`
   commit and push it to GitHub.
3. Prepare a draft GitHub Release for `vX.Y.Z` with installation instructions
   and highlights.
4. In **Actions → Publish npm packages → Run workflow**, set
   `release_ref=vX.Y.Z` and `npm_tag=latest`.
5. Approve the protected `npm` environment deployment after confirming the npm
   trusted publisher is configured.
6. Verify package provenance, README rendering, licenses, dependency links, and
   installation from the public registry, then publish the draft GitHub Release.

The workflow checks out the immutable tag, reruns `pnpm release:check`, and
publishes the tarballs in dependency order with public access and provenance.
No npm token is used. A failed authentication attempt does not complete a release;
verify all five registry versions before publishing the GitHub Release.

## Post-release smoke test

```bash
mkdir emoji-styles-smoke && cd emoji-styles-smoke
npm init -y
npm install react react-dom react-emoji-styles
node --input-type=module --eval 'await import("react-emoji-styles"); console.log("ok")'
```

Also verify the live demo and update any temporary documentation that still
describes the packages as unpublished.
