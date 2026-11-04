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
  'upload-error', 'incorrect',
];
const routes = ['nia-sign', 'nia-lab', 'sign-introduction', 'sign-calibration'];
const viewports = [
  { name: 'desktop', width: 1536, height: 1024, output: desktopRoot },
  { name: 'tablet', width: 1024, height: 768, output: path.join(qaRoot, 'responsive', 'tablet') },
  { name: 'mobile', width: 390, height: 844, output: path.join(qaRoot, 'responsive', 'mobile') },
];
const screenArg = process.argv.find(value => value.startsWith('--screen='))?.split('=')[1];
const viewportArg = process.argv.find(value => value.startsWith('--viewport='))?.split('=')[1];
const landingOnly = process.argv.includes('--landing');
const axeAudit = process.argv.includes('--axe');
const axeFindings = [];
const routeArg = process.argv.find(value => value.startsWith('--route='))?.split('=')[1];
const selectedScreens = landingOnly || routeArg ? [] : (screenArg ? screens.filter(screen => screen === screenArg) : screens);
const selectedRoutes = landingOnly || screenArg ? [] : (routeArg ? routes.filter(route => route === routeArg) : routes);
const customViewport = viewportArg?.match(/^(\d+)x(\d+)$/);
const selectedViewports = customViewport
  ? [{ name: viewportArg, width: Number(customViewport[1]), height: Number(customViewport[2]), output: path.join(qaRoot, 'responsive', `custom-${viewportArg}`) }]
  : viewportArg ? viewports.filter(viewport => viewport.name === viewportArg) : viewports;
assert.ok(selectedScreens.length || selectedRoutes.length || landingOnly, `Unknown screen or route: ${screenArg || routeArg}`);
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
async function checkAccessibility(page, label) {
  if (!axeAudit) return;
  await page.addScriptTag({ path: path.join(here, 'node_modules', 'axe-core', 'axe.min.js') });
  const violations = await page.evaluate(async () => {
    const result = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } });
    return result.violations.map(({ id, impact, nodes }) => ({ id, impact, targets: nodes.map(node => ({ target: node.target, summary: node.failureSummary })) }));
  });
  if (violations.length) axeFindings.push({ page: label, violations });
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
    if ((!screenArg && !routeArg) || landingOnly) {
      await page.goto(`${baseUrl}/?qa=1`, { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      await verifyPage(page, `${viewport.name}: landing`);
      await checkAccessibility(page, `${viewport.name}: landing`);
      await page.screenshot({
        path: path.join(viewport.output, '00-landing.png'),
        fullPage: true,
      });
    }
    for (const screen of selectedScreens) {
      const index = screens.indexOf(screen);
      const badResponses = [];
      const runtimeErrors = [];
      page.removeAllListeners('response');
      page.removeAllListeners('console');
      page.removeAllListeners('pageerror');
      page.on('console', message => { if (message.type() === 'error') runtimeErrors.push(message.text()); });
      page.on('pageerror', error => runtimeErrors.push(error.message));
      page.on('response', response => {
        if (response.status() >= 400) badResponses.push(`${response.status()} ${response.url()}`);
      });
      await page.goto(`${baseUrl}/app?screen=${screen}&qa=1`, { waitUntil: 'networkidle' });
      if (screen === 'explanation') {
        await page.waitForFunction(() => /Nia is ready|Nia could not load/.test(document.querySelector('.nia-sign-status')?.textContent || ''), null, { timeout: 15000 }).catch(async error => { throw new Error(`${error.message}; status: ${await page.locator('.nia-sign-status').textContent()}; responses: ${badResponses.join(', ')}; runtime: ${runtimeErrors.slice(0, 3).join(', ')}`); });
      }
      await page.evaluate(() => document.fonts.ready);
      await verifyPage(page, `${viewport.name}: ${screen}`);
      await checkAccessibility(page, `${viewport.name}: ${screen}`);
      assert.deepEqual(badResponses, [], `${viewport.name}: ${screen} requests`);
      const filename = `${String(index + 1).padStart(2, '0')}-${screen}.png`;
      await page.screenshot({ path: path.join(viewport.output, filename), fullPage: true });
      if (screen === 'library') {
        assert.equal(await page.locator('.dj-subject-icon').count(), 6, `${viewport.name}: six reference subject illustrations`);
        await page.getByLabel('Filter lesson plans by subject').selectOption('Mathematics');
        assert.equal(await page.locator('.dj-subjects article').count(), 1, `${viewport.name}: subject filter works`);
        await page.locator('.dj-teacher-menu summary').click();
        assert.equal(await page.locator('.dj-teacher-dropdown a').isVisible(), true, `${viewport.name}: Teacher menu exposes Profile`);
      }
      if (screen === 'create') {
        await page.getByRole('button', { name: /Start from scratch/ }).click();
        await page.getByRole('tab', { name: /Paste text/i }).waitFor();
      }
      if (screen === 'review') {
        await page.getByRole('button', { name: 'Questions (5)' }).click();
        assert.equal(await page.getByText('What causes blurred vision in astigmatism?').isVisible(), true, `${viewport.name}: review sections work`);
      }
      if (screen === 'class') {
        await page.getByRole('radio', { name: /Grade 12B/ }).click();
        await page.getByRole('button', { name: 'Assign lesson' }).click();
        assert.equal(await page.getByText('Grade 12B.').isVisible(), true, `${viewport.name}: selected class is assigned`);
      }
    }
    for (const route of selectedRoutes) {
      await page.goto(`${baseUrl}/${route}?qa=1`, { waitUntil: 'load' });
      if (route === 'nia-sign') {
        await page.waitForFunction(() => /Nia is ready|Nia could not load/.test(document.querySelector('.nia-sign-status')?.textContent || ''), null, { timeout: 15000 });
      } else {
        await page.waitForTimeout(500);
      }
      await page.evaluate(() => document.fonts.ready);
      await verifyPage(page, `${viewport.name}: ${route}`);
      await checkAccessibility(page, `${viewport.name}: ${route}`);
      await page.screenshot({ path: path.join(viewport.output, `${String(screens.length + routes.indexOf(route) + 1).padStart(2, '0')}-${route}.png`), fullPage: true });
    }
    if (!landingOnly && !screenArg && !routeArg) {
      for (let subjectIndex = 0; subjectIndex < 6; subjectIndex++) {
        await page.goto(`${baseUrl}/app?screen=library&qa=1`, { waitUntil: 'networkidle' });
        const subjectName = await page.locator('.dj-subjects article').nth(subjectIndex).locator('b').textContent();
        const slug = subjectName.toLowerCase().replace(/\s+/g, '-');
        await page.locator('.dj-subjects article').nth(subjectIndex).click();
        await verifyPage(page, `${viewport.name}: ${subjectName} lessons`);
        await checkAccessibility(page, `${viewport.name}: ${subjectName} lessons`);
        await page.screenshot({ path: path.join(viewport.output, `33-${slug}-lessons.png`), fullPage: true });
        for (let lessonIndex = 0; lessonIndex < 2; lessonIndex++) {
          await page.locator('.lb-lesson-card').nth(lessonIndex).click();
          await verifyPage(page, `${viewport.name}: ${subjectName} reader ${lessonIndex + 1}`);
          await checkAccessibility(page, `${viewport.name}: ${subjectName} reader ${lessonIndex + 1}`);
          await page.screenshot({ path: path.join(viewport.output, `34-${slug}-reader-${lessonIndex + 1}.png`), fullPage: true });
          await page.locator('.lb-reader .lb-back').click();
        }
      }
    }
    await page.close();
    console.log(`${viewport.name}: ${selectedScreens.length} screens and ${selectedRoutes.length} routes verified`);
  }
  if (axeAudit) {
    const report = path.join(qaRoot, 'accessibility-findings.json');
    await fs.writeFile(report, JSON.stringify(axeFindings, null, 2));
    console.log(`axe: ${axeFindings.length} pages with findings; ${report}`);
  }
} finally {
  await browser?.close();
  server.close();
}
