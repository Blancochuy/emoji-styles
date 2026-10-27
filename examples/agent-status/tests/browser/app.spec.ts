import { expect, test } from "@playwright/test";

test("serves SSR, hydrates, switches states and preserves labels after HTTP image failure", async ({
  page,
  request,
}) => {
  const source = await request.get("/");
  expect(await source.text()).toContain('alt="Agent working"');
  const errors: string[] = [];
  const externalRequests: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      /hydration|did not match/i.test(message.text())
    )
      errors.push(message.text());
  });
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (url.hostname !== "127.0.0.1") {
      externalRequests.push(url.href);
      return route.abort();
    }
    if (url.pathname.includes("/unavailable-"))
      return route.fulfill({ status: 404, body: "Artwork unavailable" });
    return route.continue();
  });
  await page.goto("/");
  const working = page.getByRole("img", { name: "Agent working", exact: true });
  await expect(working).toBeVisible();
  await expect(working).toHaveJSProperty("naturalWidth", 96);
  await page.getByRole("button", { name: /Completed/ }).focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("img", { name: "Agent completed", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /Completed/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByRole("button", { name: /Needs attention/ }).click();
  await expect(
    page.getByRole("img", { name: "Agent needs attention", exact: true }),
  ).toHaveJSProperty("naturalWidth", 96);
  await page
    .getByRole("checkbox", { name: /Simulate unavailable artwork/ })
    .check();
  const native = page.getByRole("img", {
    name: "Agent needs attention",
    exact: true,
  });
  await expect(native).toHaveAttribute("data-provider", "native");
  await expect(page.getByRole("status")).toContainText(
    "A check needs your attention",
  );
  await page
    .getByRole("checkbox", { name: /Simulate unavailable artwork/ })
    .uncheck();
  await expect(
    page.getByRole("img", { name: "Agent needs attention", exact: true }),
  ).toHaveJSProperty("naturalWidth", 96);
  expect(errors).toEqual([]);
  expect(externalRequests).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
