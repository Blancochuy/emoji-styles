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

Trusted Publishing uses GitHub's short-lived OIDC identity and is the required
steady-state authentication method. npm currently requires a package to exist
before a trusted publisher can be attached, so the first publication has a
one-time bootstrap step described below.

## Bootstrap only for a new, unpublished package

1. Create a granular npm access token limited to package publication, with the
   shortest practical expiration and 2FA bypass enabled for CI.
2. Store it as `NPM_TOKEN` in the protected GitHub environment named `npm`, not
   as a repository-wide secret.
3. Require manual approval on that environment and run the tagged release workflow.
4. After all five packages exist, configure each package's Trusted Publisher:
   GitHub owner `Blancochuy`, repository `emoji-styles`, workflow filename
   `npm-release.yml`, environment `npm`, and allowed action `npm publish`.
5. Delete the GitHub `NPM_TOKEN` environment secret and revoke the npm token.

Future releases authenticate only with GitHub's short-lived OIDC identity.
Never commit an npm token or leave a bootstrap token active after configuring
Trusted Publishing. Confirm the publisher settings in npm; repository source
alone cannot verify account configuration.

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
3. Create a GitHub Release for `vX.Y.Z` with installation instructions and
   highlights.
4. In **Actions → Publish npm packages → Run workflow**, set
   `release_ref=vX.Y.Z` and `npm_tag=latest`.
5. Approve the protected `npm` environment deployment after confirming Trusted
   Publishing is configured and no bootstrap token remains.
6. Verify package provenance, README rendering, licenses, dependency links, and
   installation from the public registry.

The workflow checks out the immutable tag, reruns `pnpm release:check`, and
publishes the tarballs in dependency order with public access and provenance.
The optional token is only for bootstrapping new package names. Existing
packages should use Trusted Publishing without a token.

## Post-release smoke test

```bash
mkdir emoji-styles-smoke && cd emoji-styles-smoke
npm init -y
npm install react react-dom react-emoji-styles
node --input-type=module --eval 'await import("react-emoji-styles"); console.log("ok")'
```

Also verify the live demo and update any temporary documentation that still
describes the packages as unpublished.
