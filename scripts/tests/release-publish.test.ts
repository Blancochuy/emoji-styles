import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(fileURLToPath(new URL("../../.github/workflows/npm-release.yml", import.meta.url)), "utf8");
const publishStep = workflow.split("      - name: Publish with provenance\n")[1];
const publishScript = publishStep?.split("        run: |\n")[1]?.split("\n").map((line) => line.slice(10)).join("\n");
if (!publishScript) throw new Error("Cannot find the release publication shell step");
const names = ["emoji-styles-data", "emoji-styles", "react-emoji-styles", "emoji-styles-web", "emoji-styles-assets-twemoji"];

// Override npm inside the child shell: these cases never contact a registry or publish.
const mock = `
npm() {
  case "$1" in
    view)
      if [ "$TEST_SCENARIO" = absent ] || { [ "$TEST_SCENARIO" = partial ] && [ "$PACKAGE_NAME" != emoji-styles-data ]; }; then
        return 1
      fi
      if [ "$TEST_SCENARIO" = mismatch ]; then
        echo '\"sha512-different\"'
      else
        printf '\"sha512-%s\"\\n' "$(openssl dgst -sha512 -binary ".release/$PACKAGE_NAME-1.2.3.tgz" | openssl base64 -A)"
      fi
      ;;
    publish) echo "$2" >> "$TEST_PUBLISH_LOG" ;;
    *) echo "Unexpected npm command: $1" >&2; return 2 ;;
  esac
}
`;

function run(scenario: string, oidc = true) {
  const directory = mkdtempSync(join(tmpdir(), "emoji-release-shell-"));
  const log = join(directory, "published.txt");
  try {
    mkdirSync(join(directory, "packages/core"), { recursive: true });
    mkdirSync(join(directory, ".release"));
    writeFileSync(join(directory, "packages/core/package.json"), JSON.stringify({ version: "1.2.3" }));
    for (const name of names) writeFileSync(join(directory, `.release/${name}-1.2.3.tgz`), `fixture ${name}`);
    writeFileSync(log, "");
    let failed = false;
    try {
      execFileSync("bash", ["-e", "-c", mock + publishScript], {
        cwd: directory,
        env: { ...process.env, ACTIONS_ID_TOKEN_REQUEST_URL: oidc ? "mock" : "", ACTIONS_ID_TOKEN_REQUEST_TOKEN: oidc ? "mock" : "", TEST_SCENARIO: scenario, TEST_PUBLISH_LOG: log, NPM_TAG: "latest" },
        stdio: "pipe",
      });
    } catch { failed = true; }
    return { failed, published: readFileSync(log, "utf8").trim().split("\n").filter(Boolean) };
  } finally { rmSync(directory, { recursive: true, force: true }); }
}

describe("release publication shell", () => {
  it("publishes absent packages in dependency order", () => {
    expect(run("absent")).toEqual({ failed: false, published: names.map((name) => `.release/${name}-1.2.3.tgz`) });
  });
  it("resumes a partial release without republishing identical registry bytes", () => {
    expect(run("partial")).toEqual({ failed: false, published: names.slice(1).map((name) => `.release/${name}-1.2.3.tgz`) });
    expect(run("identical")).toEqual({ failed: false, published: [] });
  });
  it("rejects an existing version with different integrity", () => {
    expect(run("mismatch")).toEqual({ failed: true, published: [] });
  });
  it("fails before publication when the OIDC environment is absent", () => {
    expect(run("absent", false)).toEqual({ failed: true, published: [] });
  });
});
