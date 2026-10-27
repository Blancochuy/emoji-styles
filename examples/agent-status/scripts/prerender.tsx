import { readFile, writeFile } from "node:fs/promises";
import { renderToString } from "react-dom/server";
import { App } from "../src/App";

// Build-time SSR: ship real markup, then hydrate the same initial state.
const path = new URL("../dist/index.html", import.meta.url);
const template = await readFile(path, "utf8");
if (!template.includes("<!--app-->"))
  throw new Error("Missing SSR insertion marker");
await writeFile(path, template.replace("<!--app-->", renderToString(<App />)));
console.log("Prerendered Agent Desk with its initial accessible artwork.");
