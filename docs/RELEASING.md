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
- npm Trusted Publishing configured for `Blancochuy/emoji-styles`, workflow
  `npm-release.yml`, and environment `npm`.
- A clean `master` commit with all required checks passing.

Trusted Publishing uses GitHub's short-lived OIDC identity. Do not create a
long-lived automation token or commit an `NPM_TOKEN` secret for this workflow.

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
5. Approve the protected `npm` environment deployment.
6. Verify package provenance, README rendering, licenses, dependency links, and
   installation from the public registry.

The workflow checks out the immutable tag, reruns `pnpm release:check`, and
publishes the tarballs in dependency order with public access and provenance.
It cannot publish successfully until npm Trusted Publishing is configured.

## Post-release smoke test

```bash
mkdir emoji-styles-smoke && cd emoji-styles-smoke
npm init -y
npm install react react-dom react-emoji-styles
node --input-type=module --eval 'await import("react-emoji-styles"); console.log("ok")'
```

Also verify the live demo and update any temporary documentation that still
describes the packages as unpublished.
