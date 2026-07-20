# Release process

Emoji Styles publishes five public npm packages from one verified version:

1. `emoji-styles-data`
2. `emoji-styles`
3. `react-emoji-styles`
4. `emoji-styles-web`
5. `emoji-styles-assets-twemoji`

The order is intentional because later packages depend on earlier packages.
CLI, MCP, asset-pipeline, GitHub Action source, fixtures, scripts, and the demo
remain private workspace packages in the first release.

## Prerequisites

- An npm account with two-factor authentication enabled.
- The five package names must still be unclaimed immediately before release.
- A protected GitHub environment named `npm`.
- A clean `master` commit with all required checks passing.

Trusted Publishing uses GitHub's short-lived OIDC identity and is the required
steady-state authentication method. npm currently requires a package to exist
before a trusted publisher can be attached, so the first publication has a
one-time bootstrap step described below.

## First-release authentication bootstrap

1. Create a granular npm access token limited to package publication, with the
   shortest practical expiration and 2FA bypass enabled for CI.
2. Store it as `NPM_TOKEN` in the protected GitHub environment named `npm`, not
   as a repository-wide secret.
3. Require manual approval on that environment and run the v0.1.0 workflow.
4. After all five packages exist, configure each package's Trusted Publisher:
   GitHub owner `Blancochuy`, repository `emoji-styles`, workflow filename
   `npm-release.yml`, environment `npm`, and allowed action `npm publish`.
5. Delete the GitHub `NPM_TOKEN` environment secret and revoke the npm token.

Future releases authenticate only with GitHub's short-lived OIDC identity.
Never commit an npm token or leave the bootstrap token active after v0.1.0.

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

## Publish v0.1.0

1. Merge the release-readiness PR after CI is green.
2. Create the signed or annotated tag `v0.1.0` from the verified `master`
   commit and push it to GitHub.
3. Create a GitHub Release for `v0.1.0` with installation instructions and
   highlights.
4. In **Actions → Publish npm packages → Run workflow**, set
   `release_ref=v0.1.0` and `npm_tag=latest`.
5. Approve the protected `npm` environment deployment. For v0.1.0, confirm the
   temporary bootstrap token is present; for later releases, confirm it is not.
6. Verify package provenance, README rendering, licenses, dependency links, and
   installation from the public registry.

The workflow checks out the immutable tag, reruns `pnpm release:check`, and
publishes the tarballs in dependency order with public access and provenance.
For v0.1.0 the workflow authenticates with the temporary environment token and
still emits provenance from the public GitHub-hosted build. Once the packages
exist, all subsequent releases use Trusted Publishing without a token.

## Post-release smoke test

```bash
mkdir emoji-styles-smoke && cd emoji-styles-smoke
npm init -y
npm install react react-dom react-emoji-styles
node --input-type=module --eval 'await import("react-emoji-styles"); console.log("ok")'
```

Also verify the live demo and update any temporary documentation that still
describes the packages as unpublished.
