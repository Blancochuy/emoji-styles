import { describe, expect, it, vi } from "vitest";
import { integrityOf, publishMcp } from "../mcp-publish.mjs";

const bytes = Buffer.from("verified tarball fixture");
const manifest = { name: "emoji-styles-mcp", version: "0.1.0", repository: { url: "git+https://github.com/Blancochuy/emoji-styles.git" }, publishConfig: { provenance: true } };
const env = { ACTIONS_ID_TOKEN_REQUEST_URL: "mock", ACTIONS_ID_TOKEN_REQUEST_TOKEN: "mock" };
const published = () => ({ ...manifest, dist: { integrity: integrityOf(bytes), attestations: { provenance: { predicateType: "https://slsa.dev/provenance/v1" } } } });
function fixture(settings = {}) {
  let version = settings.version;
  let owner = settings.owner === false ? undefined : { maintainers: [{ name: settings.maintainer ?? "blancochuy" }], "dist-tags": { latest: version ? "0.1.0" : "0.0.0" } };
  let writes = 0;
  let postPublishVersionReads = 0;
  let lostResponse = settings.lostResponse;
  const npm = vi.fn((args) => {
    if (args[0] === "whoami") return settings.identity ?? "blancochuy\n";
    expect(args).toEqual(["publish", "/verified/mcp.tgz", "--access", "public", "--provenance", "--tag", "latest", "--registry", "https://registry.npmjs.org"]);
    writes++; version = settings.published ?? published();
    owner = { maintainers: [{ name: "blancochuy" }], "dist-tags": { latest: settings.wrongTag ? "0.0.0" : "0.1.0" } };
    return "";
  });
  const fetcher = vi.fn(async (url) => {
    if (writes && lostResponse) { lostResponse = false; throw new Error("Connection lost after publish"); }
    if (settings.httpError) return { status: 503, ok: false };
    const readingVersion = url.endsWith("/0.1.0");
    if (writes && readingVersion && postPublishVersionReads++ < (settings.visibilityDelay ?? 0)) return { status: 404, ok: false };
    const value = readingVersion ? version : owner;
    return { status: value ? 200 : 404, ok: !!value, json: async () => value };
  });
  return { options: { manifest, tarball: "/verified/mcp.tgz", bytes, mode: settings.mode ?? "oidc", tag: "latest", env, fetcher, npm, wait: async () => {} }, npm, fetcher, writes: () => writes };
}
describe("MCP release registry boundary (no real publication)", () => {
  it("publishes an owned new version with provenance", async () => {
    const test = fixture();
    expect(await publishMcp(test.options)).toMatchObject({ published: true, integrity: integrityOf(bytes) });
    expect(test.writes()).toBe(1);
    expect(test.npm).toHaveBeenCalledOnce();
  });
  it("bootstraps a missing package only with the maintainer browser session", async () => {
    const test = fixture({ owner: false, mode: "bootstrap" });
    expect(await publishMcp(test.options)).toMatchObject({ published: true });
    expect(test.npm.mock.calls[0][0][0]).toBe("whoami");
    expect(test.writes()).toBe(1);
  });
  it("requires bootstrap for an absent package in OIDC mode", async () => {
    const test = fixture({ owner: false });
    await expect(publishMcp(test.options)).rejects.toThrow("First publication requires bootstrap");
    expect(test.writes()).toBe(0);
  });
  it("skips identical, attested versions on retries", async () => {
    const test = fixture({ version: published() });
    expect(await publishMcp(test.options)).toMatchObject({ published: false });
    expect(test.writes()).toBe(0);
  });
  it("rejects different bytes before any write", async () => {
    const version = published(); version.dist.integrity = "sha512-different";
    const test = fixture({ version });
    await expect(publishMcp(test.options)).rejects.toThrow("Registry bytes differ");
    expect(test.writes()).toBe(0);
  });
  it("rejects existing versions without provenance", async () => {
    const version = published(); delete version.dist.attestations;
    const test = fixture({ version });
    await expect(publishMcp(test.options)).rejects.toThrow("no provenance");
    expect(test.writes()).toBe(0);
  });
  it("does not treat a registry outage as an absent version", async () => {
    const test = fixture({ httpError: true });
    await expect(publishMcp(test.options)).rejects.toThrow("HTTP 503");
    expect(test.writes()).toBe(0);
  });
  it.each(["someone-else", "Blancochuy"]) ("rejects another package owner %s", async (maintainer) => {
    const test = fixture({ maintainer });
    await expect(publishMcp(test.options)).rejects.toThrow("different maintainer");
    expect(test.writes()).toBe(0);
  });
  it("rejects the wrong bootstrap account before registry access", async () => {
    const test = fixture({ mode: "bootstrap", identity: "someone-else" });
    await expect(publishMcp(test.options)).rejects.toThrow("maintainer's browser-authorized");
    expect(test.fetcher).not.toHaveBeenCalled(); expect(test.writes()).toBe(0);
  });
  it.each([{ NPM_TOKEN: "test" }, { NODE_AUTH_TOKEN: "test" }, {}])("requires token-free GitHub identity %j", async (badEnv) => {
    const test = fixture();
    await expect(publishMcp({ ...test.options, env: badEnv })).rejects.toThrow();
    expect(test.fetcher).not.toHaveBeenCalled(); expect(test.writes()).toBe(0);
  });
  it("recovers from unknown publication outcomes without republishing", async () => {
    const test = fixture({ lostResponse: true });
    await expect(publishMcp(test.options)).rejects.toThrow("Connection lost after publish");
    expect(test.writes()).toBe(1);
    expect(await publishMcp(test.options)).toMatchObject({ published: false });
    expect(test.writes()).toBe(1);
  });
  it("waits for an accepted upload to propagate without publishing twice", async () => {
    const test = fixture({ visibilityDelay: 8 });
    const wait = vi.fn(async () => {});
    const onPending = vi.fn();
    expect(await publishMcp({ ...test.options, wait, onPending })).toMatchObject({ published: true });
    expect(wait).toHaveBeenCalledTimes(8);
    expect(wait).toHaveBeenCalledWith(15_000);
    expect(onPending).toHaveBeenCalledTimes(8);
    expect(test.writes()).toBe(1);
  });
  it("stops bounded verification if npm never exposes an accepted upload", async () => {
    const test = fixture({ visibilityDelay: Infinity });
    const wait = vi.fn(async () => {});
    await expect(publishMcp({ ...test.options, wait })).rejects.toThrow("not yet visible");
    expect(wait).toHaveBeenCalledTimes(20);
    expect(test.writes()).toBe(1);
  });
  it("never changes dist-tags to repair a mismatch", async () => {
    const test = fixture({ wrongTag: true });
    await expect(publishMcp(test.options)).rejects.toThrow("no automatic tag changes");
    expect(test.writes()).toBe(1);
    expect(test.npm).toHaveBeenCalledOnce();
  });
});
