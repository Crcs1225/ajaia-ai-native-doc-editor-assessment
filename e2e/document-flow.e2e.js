import { chromium, expect } from "@playwright/test";
import { spawn } from "node:child_process";
import { rm } from "node:fs/promises";
import path from "node:path";

const port = 3100;
const baseURL = `http://127.0.0.1:${port}`;
const dbFile = path.join("data", `e2e-${Date.now()}.json`);

await rm(dbFile, { force: true }).catch(() => {});

const server = spawn(process.execPath, ["src/server.js"], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: String(port),
    DB_FILE: dbFile,
    SESSION_SECRET: "e2e-session-secret"
  },
  stdio: "pipe"
});

let serverOutput = "";
server.stdout.on("data", (chunk) => {
  serverOutput += chunk.toString();
});
server.stderr.on("data", (chunk) => {
  serverOutput += chunk.toString();
});

try {
  await waitForServer();
  await runFlow();
  console.log("E2E passed: create, edit, save, share, and open as shared user");
} finally {
  server.kill("SIGTERM");
  await rm(dbFile, { force: true }).catch(() => {});
}

async function waitForServer() {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 10_000) {
    if (server.exitCode !== null) {
      throw new Error(`Server exited early:\n${serverOutput}`);
    }
    try {
      const response = await fetch(`${baseURL}/`);
      if (response.ok) {
        return;
      }
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  }
  throw new Error(`Server did not start:\n${serverOutput}`);
}

async function runFlow() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const title = `E2E Product Notes ${Date.now()}`;

  try {
    await page.goto(baseURL);
    await page.getByLabel("Email").fill("alex@ajaia.test");
    await page.getByLabel("Password").fill("password123");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByRole("heading", { name: "All Documents" })).toBeVisible();
    await expect(page.getByText("Alex Owner (alex@ajaia.test)")).toBeVisible();
    await page.getByRole("button", { name: "New document" }).click();
    await expect(page.getByLabel("Document title")).toHaveValue("Untitled document");
    await page.getByLabel("Document title").fill(title);
    await page.locator(".ql-editor").fill("Product launch checklist");
    await page.locator("#saveDocument").click();
    await expect(page.getByText("Document saved.")).toBeVisible();

    await page.getByLabel("Back to Dashboard").click();
    await expect(page.getByRole("heading", { name: "All Documents" })).toBeVisible();
    await expect(page.getByRole("button", { name: new RegExp(title) })).toBeVisible();

    await page.locator('.filter-tab[data-filter="owned"]').click();
    await expect(page.getByRole("heading", { name: "Owned by Me" })).toBeVisible();
    await expect(page.getByRole("button", { name: new RegExp(title) })).toBeVisible();

    await page.locator('.filter-tab[data-filter="shared"]').click();
    await expect(page.getByRole("heading", { name: "Shared with Me" })).toBeVisible();
    await expect(page.getByRole("button", { name: new RegExp(title) })).toBeHidden();

    await page.locator('.filter-tab[data-filter="all"]').click();
    await page.getByPlaceholder("Search documents...").fill(title);
    await expect(page.getByRole("button", { name: new RegExp(title) })).toBeVisible();
    await page.getByPlaceholder("Search documents...").fill("not a real document title");
    await expect(page.getByText("No documents yet")).toBeVisible();
    await page.getByPlaceholder("Search documents...").fill("");

    await page.getByRole("button", { name: new RegExp(title) }).click();
    await page.getByLabel("Grant access to").selectOption("user_blair");
    await page.getByRole("button", { name: "Share document" }).click();
    await expect(page.getByText("Blair Reviewer")).toBeVisible();

    await page.getByLabel("Back to Dashboard").click();
    await page.getByRole("button", { name: "Sign out" }).click();
    await page.getByLabel("Email").fill("blair@ajaia.test");
    await page.getByLabel("Password").fill("password123");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByText("Shared with me")).toBeVisible();
    await expect(page.getByRole("button", { name: new RegExp(title) })).toBeVisible();
  } finally {
    await browser.close();
  }
}
