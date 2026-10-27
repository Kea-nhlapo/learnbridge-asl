import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { chromium } from 'file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, 'dist');
const qaRoot = path.join(here, 'qa');
const desktopRoot = path.join(qaRoot, 'demo');
const screens = [
  'login', 'dashboard-loading', 'dashboard', 'library-loading', 'library',
  'create', 'upload', 'generating-lesson', 'generating-questions',
  'review-loading', 'review', 'class-loading', 'class', 'assignment-success',
  'path-loading', 'path', 'question-loading', 'q1', 'q2', 'q3', 'q4', 'q5',
  'correct', 'explanation-loading', 'explanation', 'celebration',
];
const viewports = [
  { name: 'desktop', width: 1536, height: 1024, output: desktopRoot },
  { name: 'tablet', width: 1024, height: 768, output: path.join(qaRoot, 'responsive', 'tablet') },
  { name: 'mobile', width: 390, height: 844, output: path.join(qaRoot, 'responsive', 'mobile') },
];
const screenArg = process.argv.find(value => value.startsWith('--screen='))?.split('=')[1];
const viewportArg = process.argv.find(value => value.startsWith('--viewport='))?.split('=')[1];
const landingOnly = process.argv.includes('--landing');
const selectedScreens = landingOnly ? [] : (screenArg ? screens.filter(screen => screen === screenArg) : screens);
const customViewport = viewportArg?.match(/^(\d+)x(\d+)$/);
const selectedViewports = customViewport
  ? [{ name: viewportArg, width: Number(customViewport[1]), height: Number(customViewport[2]), output: path.join(qaRoot, 'responsive', `custom-${viewportArg}`) }]
  : viewportArg ? viewports.filter(viewport => viewport.name === viewportArg) : viewports;
assert.ok(selectedScreens.length || landingOnly, `Unknown screen: ${screenArg}`);
assert.ok(selectedViewports.length, `Unknown viewport: ${viewportArg}`);
const types = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.woff': 'font/woff', '.woff2': 'font/woff2',
};

const server = http.createServer(async (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://local').pathname);
  const target = path.resolve(root, `.${pathname}`);
  if (target !== root && !target.startsWith(root + path.sep)) {
    response.writeHead(403).end();
    return;
  }
  try {
    const file = target === root ? path.join(root, 'index.html') : target;
    const data = await fs.readFile(file);
    response.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' });
    response.end(data);
  } catch {
    const data = await fs.readFile(path.join(root, 'index.html'));
    response.writeHead(200, { 'content-type': 'text/html' });
    response.end(data);
  }
});

await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const baseUrl = `http://127.0.0.1:${server.address().port}`;
let browser;

async function verifyPage(page, label) {
  const brokenImages = await page.locator('img').evaluateAll(images =>
    images.filter(image => !image.complete || image.naturalWidth === 0).map(image => image.src),
  );
  assert.deepEqual(brokenImages, [], `${label}: all images load`);
  const dimensions = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth,
  }));
  assert.ok(dimensions.documentWidth <= dimensions.viewportWidth + 1, `${label}: no document overflow`);
  assert.ok(dimensions.bodyWidth <= dimensions.viewportWidth + 1, `${label}: no body overflow`);
}

try {
  browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox'],
  });
  for (const viewport of selectedViewports) {
    await fs.mkdir(viewport.output, { recursive: true });
    const page = await browser.newPage({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: 1,
      reducedMotion: 'reduce',
    });
    if (!screenArg || landingOnly) {
      await page.goto(`${baseUrl}/?qa=1`, { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      await verifyPage(page, `${viewport.name}: landing`);
      await page.screenshot({
        path: path.join(viewport.output, '00-landing.png'),
        fullPage: viewport.name !== 'desktop',
      });
    }
    for (const screen of selectedScreens) {
      const index = screens.indexOf(screen);
      const badResponses = [];
      page.removeAllListeners('response');
      page.on('response', response => {
        if (response.status() >= 400) badResponses.push(`${response.status()} ${response.url()}`);
      });
      await page.goto(`${baseUrl}/app?screen=${screen}&qa=1`, { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      await verifyPage(page, `${viewport.name}: ${screen}`);
      assert.deepEqual(badResponses, [], `${viewport.name}: ${screen} requests`);
      const filename = `${String(index + 1).padStart(2, '0')}-${screen}.png`;
      await page.screenshot({ path: path.join(viewport.output, filename) });
      if (screen === 'library') {
        assert.equal(await page.locator('.dj-subject-icon').count(), 6, `${viewport.name}: six reference subject illustrations`);
        await page.locator('.dj-teacher-menu summary').click();
        assert.equal(await page.locator('.dj-teacher-dropdown a').isVisible(), true, `${viewport.name}: Teacher menu exposes Profile`);
      }
    }
    await page.close();
    console.log(`${viewport.name}: ${selectedScreens.length} screen${selectedScreens.length === 1 ? '' : 's'} verified`);
  }
} finally {
  await browser?.close();
  server.close();
}
