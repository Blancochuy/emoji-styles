import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const registry = "https://registry.npmjs.org";
const packageName = "emoji-styles-cli";
const repository = "git+https://github.com/Blancochuy/emoji-styles.git";
export const integrityOf = (bytes) => `sha512-${createHash("sha512").update(bytes).digest("base64")}`;

/** Inject registry/installer boundaries so failure and retry paths never need real writes in tests. */
export async function publishCli({ manifest, tarball, bytes, mode, tag, env, fetcher, npm, wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms)), onPending = () => {} }) {
  assert.equal(manifest.name, packageName);
  assert.notEqual(manifest.private, true, "CLI is still private.");
  assert.equal(manifest.repository.url, repository);
  assert.equal(manifest.publishConfig.provenance, true);
  assert.match(manifest.version, /^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/);
  assert(["latest", "next"].includes(tag), "Unsupported dist-tag.");
  assert(["oidc", "bootstrap"].includes(mode), "Unsupported authentication mode.");
  assert(!env.NODE_AUTH_TOKEN && !env.NPM_TOKEN, "Token environment variables are not used by CLI releases.");
  assert(env.ACTIONS_ID_TOKEN_REQUEST_URL && env.ACTIONS_ID_TOKEN_REQUEST_TOKEN, "GitHub OIDC identity is required for provenance.");
  if (mode === "bootstrap") assert.equal(npm(["whoami", "--registry", registry], true).trim(), "blancochuy", "Bootstrap requires the package maintainer's browser-authorized npm session.");
  const get = async (suffix) => {
    const response = await fetcher(`${registry}/${packageName}${suffix}`, { signal: AbortSignal.timeout(15_000), cache: "no-store" });
    if (response.status === 404) return undefined;
    assert(response.ok, `Registry request failed: HTTP ${response.status}; publication stopped.`);
    return response.json();
  };
  const owner = await get("");
  if (!owner) assert.equal(mode, "bootstrap", "First publication requires bootstrap browser authentication; configure trusted publishing after it succeeds.");
  else assert(owner.maintainers?.some((maintainer) => maintainer.name === "blancochuy"), "The package name is owned by a different maintainer.");
  const integrity = integrityOf(bytes);
  const verify = (published) => {
    assert.equal(published.name, packageName);
    assert.equal(published.version, manifest.version);
    assert.equal(published.repository?.url, repository);
    assert.equal(published.dist?.integrity, integrity, "Registry bytes differ from the tested tarball; refusing to continue.");
    assert(published.dist?.attestations?.provenance?.predicateType, "Published version has no provenance attestation.");
  };
  const existing = await get(`/${manifest.version}`);
  if (existing) verify(existing);
  else npm(["publish", tarball, "--access", "public", "--provenance", "--tag", tag, "--registry", registry], false);
  // New packages remain unavailable while npm processes the accepted upload.
  const maxAttempts = 21;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const published = existing ?? await get(`/${manifest.version}`);
    const metadata = await get("");
    if (published && metadata?.["dist-tags"]?.[tag] === manifest.version) {
      verify(published);
      return { name: packageName, version: manifest.version, integrity, published: !existing, tag };
    }
    onPending({ attempt: attempt + 1, maxAttempts, version: manifest.version });
    if (attempt < maxAttempts - 1) await wait(15_000);
  }
  throw new Error("Publication or dist-tag is not yet visible. Check npm state before retrying; no automatic tag changes are performed.");
}

async function main() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const manifest = JSON.parse(readFileSync(join(root, "packages/cli/package.json"), "utf8"));
  const tarball = join(root, `.release-cli/${packageName}-${manifest.version}.tgz`);
  const npmPath = process.env.npm_execpath;
  assert(npmPath?.endsWith("npm-cli.js"), "Run this script through npm run cli:publish.");
  const result = await publishCli({
    manifest, tarball, bytes: readFileSync(tarball), mode: process.env.CLI_AUTH_MODE,
    tag: process.env.NPM_TAG, env: process.env, fetcher: globalThis.fetch,
    onPending: ({ attempt, maxAttempts, version }) => console.log(`npm accepted ${packageName}@${version}; waiting for registry visibility (${attempt}/${maxAttempts}).`),
    npm: (args, capture) => execFileSync(process.execPath, [npmPath, ...args], { cwd: root, encoding: "utf8", stdio: capture ? "pipe" : "inherit" }),
  });
  console.log(JSON.stringify(result));
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await main();
