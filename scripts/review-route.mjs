#!/usr/bin/env node
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { chromium } from "@playwright/test";

const route = process.argv[2];
if (!route?.startsWith("/") || route.startsWith("//")) {
  throw new Error("usage: review-route.mjs /posts/slug");
}

const profiles = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
];

function freePort() {
  return new Promise((resolve, reject) => {
    const server = http.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => resolve(address.port));
    });
  });
}

async function waitForPage(url, serverOutput, timeoutMs = 120_000) {
  const deadline = Date.now() + timeoutMs;
  let lastError = "server did not answer";
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { redirect: "manual" });
      if (response.status < 500) return response;
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`${lastError}\n${serverOutput()}`);
}

async function stopProcessGroup(child) {
  if (!child.pid || child.exitCode !== null) return;
  try {
    process.kill(-child.pid, "SIGTERM");
  } catch {}
  await Promise.race([
    new Promise((resolve) => child.once("exit", resolve)),
    new Promise((resolve) => setTimeout(resolve, 3_000)),
  ]);
  if (child.exitCode === null) {
    try {
      process.kill(-child.pid, "SIGKILL");
    } catch {}
  }
}

async function reviewPage(page, url, profile, outputDirectory) {
  const consoleErrors = [];
  const failedRequests = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("requestfailed", (request) => {
    failedRequests.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText ?? "failed"}`);
  });
  const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
  if (!response?.ok()) throw new Error(`${profile.name} route returned HTTP ${response?.status() ?? "unknown"}`);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);

  const screenshots = [];
  let index = 0;
  let previousY = -1;
  while (true) {
    const position = await page.evaluate(() => ({
      y: window.scrollY,
      next: Math.min(
        window.scrollY + Math.max(320, window.innerHeight - 100),
        Math.max(0, document.documentElement.scrollHeight - window.innerHeight),
      ),
      bottom: window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2,
    }));
    index += 1;
    const filename = `${profile.name}-${String(index).padStart(2, "0")}.png`;
    await page.screenshot({ path: path.join(outputDirectory, filename) });
    screenshots.push(filename);
    if (position.bottom || position.next === previousY) break;
    if (index >= 200) {
      throw new Error(`${profile.name} review did not reach the page bottom after ${index} screenshots`);
    }
    previousY = position.y;
    await page.evaluate((next) => window.scrollTo(0, next), position.next);
    await page.waitForTimeout(180);
  }

  const geometry = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  return { profile: profile.name, screenshots, consoleErrors, failedRequests, geometry };
}

const port = await freePort();
const baseUrl = `http://127.0.0.1:${port}`;
const outputDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "roof-route-review-"));
const serverLines = [];
const server = spawn(
  "npm",
  ["run", "dev", "--", "--hostname", "127.0.0.1", "--port", String(port)],
  { cwd: process.cwd(), detached: true, env: process.env, stdio: ["ignore", "pipe", "pipe"] },
);
for (const stream of [server.stdout, server.stderr]) {
  stream.on("data", (chunk) => {
    serverLines.push(String(chunk));
    if (serverLines.length > 80) serverLines.shift();
  });
}

let browser;
try {
  const response = await waitForPage(`${baseUrl}${route}`, () => serverLines.join(""));
  if (!response.ok) throw new Error(`route returned HTTP ${response.status}`);
  browser = await chromium.launch({ headless: true });
  const results = [];
  for (const profile of profiles) {
    // Route review audits the settled publication, not a transient frame from
    // the entrance choreography. Reduced motion also keeps long-page captures
    // deterministic as each newly visible section enters the viewport.
    const context = await browser.newContext({ viewport: profile, reducedMotion: "reduce" });
    try {
      results.push(await reviewPage(await context.newPage(), `${baseUrl}${route}`, profile, outputDirectory));
    } finally {
      await context.close();
    }
  }
  process.stdout.write(`${JSON.stringify({ route, outputDirectory, results }, null, 2)}\n`);
} finally {
  await browser?.close();
  await stopProcessGroup(server);
}
