import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, realpath } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { renderToString } from "react-dom/server";
import { EmojiToken } from "react-emoji-styles";
import { resolveEmojiToken } from "emoji-styles";
import { App } from "../src/App";
import { createAgentTheme, states } from "../src/theme";

test("uses published packages inside this consumer, without workspace links", async () => {
  for (const name of [
    "emoji-styles",
    "react-emoji-styles",
    "emoji-styles-data",
  ]) {
    const path = await realpath(fileURLToPath(import.meta.resolve(name)));
    assert.ok(
      path.startsWith(new URL("../node_modules/", import.meta.url).pathname),
      path,
    );
    const manifest = JSON.parse(
      await readFile(
        new URL(`../node_modules/${name}/package.json`, import.meta.url),
        "utf8",
      ),
    );
    assert.equal(manifest.version, "0.1.1");
  }
});

test("every semantic token resolves to its local original artwork and label", async () => {
  const theme = createAgentTheme();
  const provenance = JSON.parse(
    await readFile(
      new URL("../public/emoji/PROVENANCE.json", import.meta.url),
      "utf8",
    ),
  );
  for (const [key, state] of Object.entries(states)) {
    const result = await resolveEmojiToken(`agent.${key}`, theme);
    assert.equal(result.label, state.label);
    assert.equal(result.emoji, state.emoji);
    assert.equal(result.asset?.url, `/emoji/${state.file}`);
    assert.equal(result.asset?.local, true);
    assert.equal(result.asset?.license?.name, "MIT");
    const svg = await readFile(
      new URL(`../public/emoji/${state.file}`, import.meta.url),
      "utf8",
    );
    assert.equal(
      createHash("sha256").update(svg).digest("hex"),
      provenance.assets.find(
        (asset: { file: string }) => asset.file === state.file,
      )?.sha256,
    );
    assert.match(svg, /viewBox="0 0 96 96"/);
    assert.doesNotMatch(svg, /<script|<foreignObject|href=|<image/);
    const html = renderToString(
      <EmojiToken token={`agent.${key}`} theme={theme} size={80} />,
    );
    assert.ok(html.includes(`src="/emoji/${state.file}"`));
    assert.ok(html.includes(`alt="${state.label}"`));
  }
});

test("SSR emits the meaningful initial task and artwork before effects run", () => {
  const html = renderToString(<App />);
  assert.ok(html.includes("Review the checkout changes"));
  assert.ok(html.includes('src="/emoji/working.svg"'));
  assert.ok(html.includes('alt="Agent working"'));
  assert.ok(html.includes('role="status"'));
  assert.ok(html.includes('aria-pressed="true"'));
});
